import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/studio/PageHeader";
import { MultiSelectField } from "@/components/onboarding/MultiSelectField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import type { CampaignBudgetType, FollowerRange } from "@/types/database";

const FOLLOWER_RANGES: FollowerRange[] = ["Below 1K", "1K-10K", "10K-50K", "50K-100K", "100K-500K", "500K+"];

export function CampaignNewPage() {
  const createCampaign = useCreateCampaign();
  const navigate = useNavigate();

  const [title, setTitle] = React.useState("");
  const [brief, setBrief] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [budgetType, setBudgetType] = React.useState<CampaignBudgetType>("paid");
  const [budgetAmount, setBudgetAmount] = React.useState("");
  const [targetTiers, setTargetTiers] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) {
      toast.error("Campaign title is required.");
      return;
    }
    setSubmitting(true);
    try {
      const campaign = await createCampaign.mutateAsync({
        title,
        brief,
        category,
        budget_type: budgetType,
        budget_amount: budgetType === "barter" ? null : Number(budgetAmount) || null,
        target_creator_tiers: targetTiers as FollowerRange[],
        status: "open",
      });
      toast.success("Campaign created — head to Discover Creators to invite someone.");
      navigate(`/dashboard/brand/discover?campaignId=${campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New campaign" description="Describe the collaboration you're looking for." />
      <Card>
        <CardHeader><CardTitle>Campaign details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Diwali UGC push" required />
            </div>
            <div className="space-y-1.5">
              <Label>Brief</Label>
              <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What are you looking for? Deliverables, tone, timeline…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Fashion, Food, Tech…" />
              </div>
              <div className="space-y-1.5">
                <Label>Budget type</Label>
                <Select value={budgetType} onValueChange={(v) => setBudgetType(v as CampaignBudgetType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="barter">Barter</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {budgetType !== "barter" && (
              <div className="space-y-1.5">
                <Label>Budget amount (₹)</Label>
                <Input type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} placeholder="25000" />
              </div>
            )}
            <MultiSelectField label="Target creator tiers" options={FOLLOWER_RANGES} value={targetTiers} onChange={setTargetTiers} />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating…" : "Create campaign"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
