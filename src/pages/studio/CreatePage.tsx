import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/context/WorkspaceContext";
import { usePresenters } from "@/hooks/usePresenters";
import { usePlatformCatalog, useSocialAccounts } from "@/hooks/useSocial";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { supabase } from "@/lib/supabase";
import type { AspectRatio, QualityProfile } from "@/types/database";

const LANGUAGES = ["English", "Hindi", "Hinglish", "Tamil", "Telugu", "Bengali", "Marathi", "Spanish", "Arabic"];
const STYLES = ["Premium UGC", "Corporate", "Startup / Founder-led", "Real Estate", "E-commerce", "Educational"];
const DURATIONS = [15, 20, 25, 30, 45, 60];

export function CreatePage() {
  const navigate = useNavigate();
  const { currentWorkspace, automationSettings } = useWorkspace();
  const { data: presenters } = usePresenters();
  const { data: platforms } = usePlatformCatalog();
  const { data: socialAccounts } = useSocialAccounts();
  const createCampaign = useCreateCampaign();

  const connectedAccounts = (socialAccounts ?? []).filter((a) => a.status === "connected");

  const [form, setForm] = React.useState({
    name: "",
    productName: "",
    targetAudience: "",
    language: "English",
    style: "Premium UGC",
    durationSeconds: 30,
    presenterId: "",
    cta: "",
    landingUrl: "",
    aspectRatio: "9:16" as AspectRatio,
    qualityProfile: (automationSettings?.default_quality_profile ?? "economy") as QualityProfile,
    whatsappEnabled: false,
    emailEnabled: false,
    publishToAllConnected: true,
    selectedChannels: [] as string[],
    scheduledAt: "",
  });
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (automationSettings?.default_quality_profile) {
      setForm((f) => ({ ...f, qualityProfile: automationSettings.default_quality_profile }));
    }
  }, [automationSettings?.default_quality_profile]);

  function toggleChannel(key: string) {
    setForm((f) => ({
      ...f,
      selectedChannels: f.selectedChannels.includes(key)
        ? f.selectedChannels.filter((c) => c !== key)
        : [...f.selectedChannels, key],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentWorkspace) {
      toast.error("No workspace selected yet.");
      return;
    }
    if (automationSettings?.video_generation_paused) {
      toast.error("Video generation is currently paused for this workspace (see Settings → Emergency Controls).");
      return;
    }

    setSubmitting(true);
    try {
      const campaign = await createCampaign.mutateAsync({
        workspace_id: currentWorkspace.id,
        name: form.name,
        product_name: form.productName,
        target_audience: form.targetAudience,
        language: form.language,
        style: form.style,
        duration_seconds: form.durationSeconds,
        presenter_id: form.presenterId || null,
        cta: form.cta,
        landing_url: form.landingUrl,
        aspect_ratio: form.aspectRatio,
        quality_profile: form.qualityProfile,
        whatsapp_enabled: form.whatsappEnabled,
        email_enabled: form.emailEnabled,
        publish_to_all_connected: form.publishToAllConnected,
        target_channel_keys: form.publishToAllConnected ? [] : form.selectedChannels,
        scheduled_at: form.scheduledAt || null,
      });

      toast.success("Campaign created. Generating script…");

      const { error: fnError } = await supabase.functions.invoke("script-generate", {
        body: { campaignId: campaign.id },
      });
      if (fnError) {
        toast.warning("Campaign created, but script generation could not be started automatically. Retry from the campaign page.");
      }

      navigate(`/studio/campaigns/${campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Create AI Ad"
        description="Turn a campaign brief into a finished AI talking-presenter video, WhatsApp/email assets, and a scheduled publish across every connected channel."
      />

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Campaign brief</CardTitle>
              <CardDescription>What are you promoting, and who is it for?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Campaign name*</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Diwali Launch — Reels Push" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="productName">Product / Service*</Label>
                  <Input id="productName" required value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} placeholder="Luxury Resort Investment" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="targetAudience">Who is it for?*</Label>
                <Textarea id="targetAudience" required value={form.targetAudience} onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))} placeholder="HNI investors aged 30-55 interested in second homes" />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <Select value={form.language} onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Style</Label>
                  <Select value={form.style} onValueChange={(v) => setForm((f) => ({ ...f, style: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <Select value={String(form.durationSeconds)} onValueChange={(v) => setForm((f) => ({ ...f, durationSeconds: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>{d} sec</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Presenter</Label>
                  <Select value={form.presenterId} onValueChange={(v) => setForm((f) => ({ ...f, presenterId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Auto-generate a presenter" /></SelectTrigger>
                    <SelectContent>
                      {(presenters ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Aspect ratio</Label>
                  <Select value={form.aspectRatio} onValueChange={(v) => setForm((f) => ({ ...f, aspectRatio: v as AspectRatio }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">9:16 (Reels / Shorts / TikTok)</SelectItem>
                      <SelectItem value="16:9">16:9 (YouTube / Landscape)</SelectItem>
                      <SelectItem value="1:1">1:1 (Feed square)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cta">Call to action</Label>
                  <Input id="cta" value={form.cta} onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))} placeholder="Book a free consultation today" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="landingUrl">Landing URL</Label>
                  <Input id="landingUrl" type="url" value={form.landingUrl} onChange={(e) => setForm((f) => ({ ...f, landingUrl: e.target.value }))} placeholder="https://example.com/offer" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publish to</CardTitle>
              <CardDescription>
                Native APIs are used first; unsupported channels automatically become a human approval task instead of
                being silently skipped or automated with stored passwords.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.publishToAllConnected} onCheckedChange={(v) => setForm((f) => ({ ...f, publishToAllConnected: Boolean(v) }))} id="allConnected" />
                  <Label htmlFor="allConnected">Publish to all connected channels ({connectedAccounts.length})</Label>
                </div>
              </div>

              {!form.publishToAllConnected && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(platforms ?? []).map((p) => (
                    <label key={p.platform_key} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                      <Checkbox checked={form.selectedChannels.includes(p.platform_key)} onCheckedChange={() => toggleChannel(p.platform_key)} />
                      {p.display_name}
                    </label>
                  ))}
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <Label htmlFor="whatsapp">WhatsApp campaign</Label>
                <Switch id="whatsapp" checked={form.whatsappEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, whatsappEnabled: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="email">Email campaign</Label>
                <Switch id="email" checked={form.emailEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, emailEnabled: v }))} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scheduledAt">Publish date/time (optional)</Label>
                <Input id="scheduledAt" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quality &amp; cost profile</CardTitle>
              <CardDescription>Controls which model tier and retry budget are used.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={form.qualityProfile} onValueChange={(v) => setForm((f) => ({ ...f, qualityProfile: v as QualityProfile }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy — 720p, Veo Lite, 1 retry</SelectItem>
                  <SelectItem value="balanced">Balanced — 1080p, Veo Fast, 2 retries</SelectItem>
                  <SelectItem value="premium">Premium — 1080p/4K, best available, 3 retries</SelectItem>
                </SelectContent>
              </Select>
              {automationSettings && (
                <p className="text-xs text-muted-foreground">
                  Guardrails: max ${automationSettings.max_cost_per_video_usd}/video · $
                  {automationSettings.max_daily_spend_usd}/day · ${automationSettings.max_monthly_spend_usd}/month
                </p>
              )}
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
            <Sparkles className="h-4 w-4" />
            {submitting ? "Creating campaign…" : "Generate Ad"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            This creates the campaign and immediately queues script generation. Video generation, QC, captions and
            publishing happen step-by-step on the campaign status page.
          </p>
        </div>
      </form>
    </div>
  );
}
