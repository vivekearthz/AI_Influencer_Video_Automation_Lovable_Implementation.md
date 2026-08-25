import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { MultiSelectField } from "@/components/onboarding/MultiSelectField";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useCreatorProfile, useUpsertCreatorProfile } from "@/hooks/useCreatorProfile";
import type { PortfolioFile } from "@/types/database";

const STEPS = ["Basic Info", "Content Profile", "Reach & Preferences", "Finish"];

const CONTENT_CATEGORIES = [
  "Fashion", "Beauty", "Food", "Travel", "Fitness", "Tech", "Education",
  "Entertainment", "Finance", "Gaming", "Motivation", "Comedy", "Photography", "UGC", "Other",
] as const;
const AUDIENCE_TYPES = ["Students", "Working Professionals", "Entrepreneurs", "Creators", "Homemakers", "Mixed", "Other"] as const;
const CONTENT_FORMATS = [
  "Reels", "Posts", "Stories", "Product Reviews", "UGC Videos", "Unboxing",
  "Event Coverage", "Brand Promotion", "YouTube Videos", "Other",
] as const;
const OPPORTUNITY_INTERESTS = [
  "Brand Collabs", "Paid Opportunities", "Barter Deals", "Networking", "Creator Events",
  "Product Gifting", "Exposure to Big Brands", "Learning & Growth", "Long Term Partnerships",
] as const;
const COLLAB_TYPES = ["Paid", "Barter", "Product Gifting", "Event Collabs", "Affiliate", "Long Term", "UGC Projects"] as const;
const FOLLOWER_RANGES = ["Below 1K", "1K-10K", "10K-50K", "50K-100K", "100K-500K", "500K+"] as const;
const REEL_VIEW_RANGES = ["Below 1K", "1K-5K", "5K-10K", "10K-50K", "50K-100K", "100K+"] as const;

const MAX_FILES = 5;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function CreatorOnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { data: existing } = useCreatorProfile();
  const upsert = useUpsertCreatorProfile();
  const navigate = useNavigate();

  const [step, setStep] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [form, setForm] = React.useState({
    contactNumber: profile?.phone ?? "",
    city: profile?.city ?? "",
    instagramUrl: "",
    youtubeUrl: "",
    otherSocialUrl: "",
    portfolioFiles: [] as PortfolioFile[],
    contentCategories: [] as string[],
    audienceType: [] as string[],
    creatorStatus: "",
    contentExperience: "",
    contentFormats: [] as string[],
    followersRange: "",
    reelViewsRange: "",
    opportunityInterests: [] as string[],
    collabTypesOpenTo: [] as string[],
    eventInterest: "",
    paidBarterInterest: "",
    contactOk: true,
    whyJoin: "",
    confirmAccurate: false,
  });

  React.useEffect(() => {
    if (existing) {
      setForm((f) => ({
        ...f,
        instagramUrl: existing.instagram_url ?? "",
        youtubeUrl: existing.youtube_url ?? "",
        otherSocialUrl: existing.other_social_url ?? "",
        portfolioFiles: existing.portfolio_files ?? [],
        contentCategories: existing.content_categories ?? [],
        audienceType: existing.audience_type ?? [],
        creatorStatus: existing.creator_status ?? "",
        contentExperience: existing.content_experience ?? "",
        contentFormats: existing.content_formats ?? [],
        followersRange: existing.instagram_followers_range ?? "",
        reelViewsRange: existing.avg_reel_views_range ?? "",
        opportunityInterests: existing.opportunity_interests ?? [],
        collabTypesOpenTo: existing.collab_types_open_to ?? [],
        eventInterest: existing.event_interest_enum ?? "",
        paidBarterInterest: existing.paid_barter_interest_enum ?? "",
        contactOk: existing.contact_ok_bool,
        whyJoin: existing.why_join ?? "",
      }));
    }
  }, [existing]);

  async function handleFileUpload(files: FileList | null) {
    if (!files || !user) return;
    const remaining = MAX_FILES - form.portfolioFiles.length;
    const toUpload = Array.from(files).slice(0, remaining);

    for (const file of toUpload) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 100MB limit.`);
        continue;
      }
      setUploading(true);
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("creator-portfolios").upload(path, file);
      if (error) {
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from("creator-portfolios").getPublicUrl(path);
      setForm((f) => ({
        ...f,
        portfolioFiles: [
          ...f.portfolioFiles,
          { storage_path: path, public_url: urlData.publicUrl, file_name: file.name, size_bytes: file.size },
        ],
      }));
    }
    setUploading(false);
  }

  function removeFile(path: string) {
    setForm((f) => ({ ...f, portfolioFiles: f.portfolioFiles.filter((pf) => pf.storage_path !== path) }));
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.contactNumber || !form.city || !form.instagramUrl) return "Contact number, city, and Instagram profile are required.";
    }
    if (step === 1) {
      if (!form.contentCategories.length || !form.audienceType.length || !form.contentExperience || !form.contentFormats.length) {
        return "Content categories, audience type, content experience, and content formats are required.";
      }
    }
    if (step === 2) {
      if (!form.followersRange || !form.reelViewsRange || !form.collabTypesOpenTo.length || !form.eventInterest || !form.paidBarterInterest) {
        return "Follower range, reel views, collab types, and both preference questions are required.";
      }
    }
    return null;
  }

  function next() {
    const error = validateStep();
    if (error) {
      toast.error(error);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleSubmit() {
    if (!form.confirmAccurate) {
      toast.error("Please confirm the information you provided is accurate.");
      return;
    }
    setSubmitting(true);
    try {
      await supabase
        .from("profiles")
        .update({ phone: form.contactNumber, city: form.city })
        .eq("id", user!.id);

      await upsert.mutateAsync({
        instagram_url: form.instagramUrl,
        youtube_url: form.youtubeUrl || null,
        other_social_url: form.otherSocialUrl || null,
        portfolio_files: form.portfolioFiles,
        content_categories: form.contentCategories as any,
        audience_type: form.audienceType as any,
        creator_status: (form.creatorStatus || null) as any,
        content_experience: (form.contentExperience || null) as any,
        content_formats: form.contentFormats as any,
        instagram_followers_range: form.followersRange as any,
        avg_reel_views_range: form.reelViewsRange as any,
        opportunity_interests: form.opportunityInterests as any,
        collab_types_open_to: form.collabTypesOpenTo as any,
        contact_ok_bool: form.contactOk,
        event_interest_enum: form.eventInterest as any,
        paid_barter_interest_enum: form.paidBarterInterest as any,
        why_join: form.whyJoin,
        onboarding_completed: true,
      });

      await refreshProfile();
      toast.success("Profile complete! Welcome to InfluenceOS.");
      navigate("/dashboard/creator");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Creator onboarding" description="Tell brands who you are — this takes about 3 minutes." />
      <StepIndicator steps={STEPS} current={step} />

      <Card>
        <CardContent className="space-y-6 p-6">
          {step === 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>WhatsApp / Contact number *</Label>
                  <Input value={form.contactNumber} onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
                <div className="space-y-1.5">
                  <Label>City *</Label>
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Mumbai" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Instagram profile link *</Label>
                <Input value={form.instagramUrl} onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))} placeholder="https://instagram.com/yourhandle" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>YouTube profile link</Label>
                  <Input value={form.youtubeUrl} onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/@yourhandle" />
                </div>
                <div className="space-y-1.5">
                  <Label>Other social profile</Label>
                  <Input value={form.otherSocialUrl} onChange={(e) => setForm((f) => ({ ...f, otherSocialUrl: e.target.value }))} placeholder="https://..." />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Portfolio (up to 5 files, 100MB each)</Label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground hover:bg-muted/40">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Click to upload images or video"}
                  <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} disabled={form.portfolioFiles.length >= MAX_FILES} />
                </label>
                {form.portfolioFiles.length > 0 && (
                  <ul className="space-y-1">
                    {form.portfolioFiles.map((pf) => (
                      <li key={pf.storage_path} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                        {pf.file_name}
                        <button type="button" onClick={() => removeFile(pf.storage_path)}>
                          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <MultiSelectField label="Content categories" options={CONTENT_CATEGORIES} value={form.contentCategories} onChange={(v) => setForm((f) => ({ ...f, contentCategories: v }))} required />
              <MultiSelectField label="Audience type" options={AUDIENCE_TYPES} value={form.audienceType} onChange={(v) => setForm((f) => ({ ...f, audienceType: v }))} required />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Creator status</Label>
                  <Select value={form.creatorStatus} onValueChange={(v) => setForm((f) => ({ ...f, creatorStatus: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Full-time", "Part-time/Side Hustler", "Aspiring", "Professional-with-presence"].map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Time creating content *</Label>
                  <Select value={form.contentExperience} onValueChange={(v) => setForm((f) => ({ ...f, contentExperience: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Less than 6mo", "6mo-1yr", "1-2yr", "2+yr"].map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <MultiSelectField label="Content formats you're comfortable creating" options={CONTENT_FORMATS} value={form.contentFormats} onChange={(v) => setForm((f) => ({ ...f, contentFormats: v }))} required />
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Instagram follower range *</Label>
                  <Select value={form.followersRange} onValueChange={(v) => setForm((f) => ({ ...f, followersRange: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {FOLLOWER_RANGES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Average Reel reach/views *</Label>
                  <Select value={form.reelViewsRange} onValueChange={(v) => setForm((f) => ({ ...f, reelViewsRange: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {REEL_VIEW_RANGES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <MultiSelectField label="Opportunity types you're interested in" options={OPPORTUNITY_INTERESTS} value={form.opportunityInterests} onChange={(v) => setForm((f) => ({ ...f, opportunityInterests: v }))} />
              <MultiSelectField label="Collab types open to" options={COLLAB_TYPES} value={form.collabTypesOpenTo} onChange={(v) => setForm((f) => ({ ...f, collabTypesOpenTo: v }))} required />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Interested in exclusive creator events? *</Label>
                  <Select value={form.eventInterest} onValueChange={(v) => setForm((f) => ({ ...f, eventInterest: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{["Yes", "No", "Maybe"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Interested in paid/barter opportunities? *</Label>
                  <Select value={form.paidBarterInterest} onValueChange={(v) => setForm((f) => ({ ...f, paidBarterInterest: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{["Yes", "Maybe", "No"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.contactOk} onChange={(e) => setForm((f) => ({ ...f, contactOk: e.target.checked }))} />
                Comfortable being contacted re: brand collabs/events/campaigns/barter
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-1.5">
                <Label>Why do you want to join InfluenceOS?</Label>
                <Textarea value={form.whyJoin} onChange={(e) => setForm((f) => ({ ...f, whyJoin: e.target.value }))} placeholder="Tell brands a bit about yourself…" />
              </div>
              <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
                <input type="checkbox" className="mt-0.5" checked={form.confirmAccurate} onChange={(e) => setForm((f) => ({ ...f, confirmAccurate: e.target.checked }))} />
                I confirm the information above is accurate, consent to DPDP-compliant data processing, and agree to
                be considered for InfluenceOS opportunities.
              </label>
            </>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>Continue</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving…" : "Complete profile"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
