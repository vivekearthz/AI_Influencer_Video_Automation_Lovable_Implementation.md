import * as React from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useBrandCampaigns } from "@/hooks/useCampaigns";
import { useCreateCollaboration } from "@/hooks/useCollaborations";
import { useQuery } from "@tanstack/react-query";
import type { CreatorProfileRow, ProfileRow } from "@/types/database";

export function CreatorProfileViewPage() {
  const { id } = useParams<{ id: string }>();
  const { profile: viewerProfile } = useAuth();
  const { data: campaigns } = useBrandCampaigns();
  const createCollaboration = useCreateCollaboration();

  const [open, setOpen] = React.useState(false);
  const [campaignId, setCampaignId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [usageDays, setUsageDays] = React.useState("90");
  const [submitting, setSubmitting] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["creator-profile-view", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [{ data: profile }, { data: creatorProfile }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id!).maybeSingle(),
        supabase.from("creator_profiles").select("*").eq("user_id", id!).maybeSingle(),
      ]);
      return { profile: profile as ProfileRow | null, creatorProfile: creatorProfile as CreatorProfileRow | null };
    },
  });

  async function handleInvite() {
    if (!campaignId) {
      toast.error("Select a campaign first.");
      return;
    }
    setSubmitting(true);
    try {
      await createCollaboration.mutateAsync({
        campaignId,
        creatorId: id!,
        agreedAmount: amount ? Number(amount) : undefined,
        usageRightsDurationDays: Number(usageDays) || 90,
      });
      toast.success("Invitation sent!");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.profile) return <p className="text-sm text-muted-foreground">Creator not found.</p>;

  const { profile, creatorProfile } = data;

  return (
    <div>
      <PageHeader
        title={profile.full_name ?? "Creator"}
        description={profile.city ?? undefined}
        actions={
          viewerProfile?.role === "brand" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Invite to campaign</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Invite {profile.full_name} to a campaign</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Campaign</Label>
                    <Select value={campaignId} onValueChange={setCampaignId}>
                      <SelectTrigger><SelectValue placeholder="Select a campaign" /></SelectTrigger>
                      <SelectContent>
                        {(campaigns ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Proposed amount (₹, optional for barter)</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Usage rights duration (days)</Label>
                    <Input type="number" value={usageDays} onChange={(e) => setUsageDays(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleInvite} disabled={submitting}>{submitting ? "Sending…" : "Send invitation"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>About</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{creatorProfile?.why_join || "No introduction provided yet."}</p>
            <div>
              <p className="mb-1 text-muted-foreground">Content categories</p>
              <div className="flex flex-wrap gap-1">
                {(creatorProfile?.content_categories ?? []).map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
              </div>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Content formats</p>
              <div className="flex flex-wrap gap-1">
                {(creatorProfile?.content_formats ?? []).map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
              </div>
            </div>
            {creatorProfile?.portfolio_files?.length ? (
              <div>
                <p className="mb-2 text-muted-foreground">Portfolio</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {creatorProfile.portfolio_files.map((f) => (
                    <a key={f.storage_path} href={f.public_url} target="_blank" rel="noreferrer" className="truncate rounded-md border border-border p-2 text-xs hover:bg-muted/40">
                      {f.file_name}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stats</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-1"><Star className="h-4 w-4 text-accent" /> {creatorProfile?.rating_avg?.toFixed(1) ?? "New"} ({creatorProfile?.rating_count ?? 0} reviews)</div>
            <div><span className="text-muted-foreground">Followers:</span> {creatorProfile?.instagram_followers_range ?? "—"}</div>
            <div><span className="text-muted-foreground">Avg reel views:</span> {creatorProfile?.avg_reel_views_range ?? "—"}</div>
            <div><span className="text-muted-foreground">Campaigns completed:</span> {creatorProfile?.campaigns_completed_count ?? 0}</div>
            {creatorProfile?.instagram_url && (
              <a href={creatorProfile.instagram_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Instagram profile ↗
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
