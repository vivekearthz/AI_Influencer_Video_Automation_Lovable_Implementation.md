import * as React from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, PlayCircle, RotateCw, Send, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { PipelineSteps } from "@/components/ai-video/PipelineSteps";
import { ChannelsStatusTable } from "@/components/ai-video/ChannelsStatusTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCampaign,
  useCampaignAssets,
  useCampaignJobs,
  useCampaignPublishJobs,
} from "@/hooks/useCampaigns";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

function useInvokeFunction(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState<string | null>(null);

  async function run(name: string, extra?: Record<string, unknown>) {
    if (!campaignId) return;
    setPending(name);
    try {
      const { data, error } = await supabase.functions.invoke(name, {
        body: { campaignId, ...extra },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${name.replace(/-/g, " ")} started`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to run ${name}`);
    } finally {
      setPending(null);
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-jobs", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-assets", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-publish-jobs", campaignId] });
    }
  }

  return { run, pending };
}

export function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const { data: jobs } = useCampaignJobs(campaignId);
  const { data: assets } = useCampaignAssets(campaignId);
  const { data: publishJobs } = useCampaignPublishJobs(campaignId);
  const { run, pending } = useInvokeFunction(campaignId);

  if (isLoading || !campaign) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const script = (assets ?? []).find((a) => a.asset_type === "script");
  const finalVideo = (assets ?? []).find((a) => a.asset_type === "final_video");
  const scriptData = script?.metadata as { spoken_script?: string; hook?: string; cta?: string } | undefined;

  async function retryPublishJob(jobId: string) {
    const { error } = await supabase.functions.invoke("social-publish", { body: { campaignId, retryJobId: jobId } });
    if (error) toast.error(error.message);
    else toast.success("Retry queued");
  }

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={campaign.product_name ?? undefined}
        actions={<StatusBadge status={campaign.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
              <CardDescription>Script → presenter → video → render → QC → captions</CardDescription>
            </CardHeader>
            <CardContent>
              <PipelineSteps jobs={jobs ?? []} />
            </CardContent>
          </Card>

          {scriptData && (
            <Card>
              <CardHeader>
                <CardTitle>Script</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {scriptData.hook && <p><span className="font-medium">Hook: </span>{scriptData.hook}</p>}
                {scriptData.spoken_script && <p className="whitespace-pre-wrap text-muted-foreground">{scriptData.spoken_script}</p>}
                {scriptData.cta && <p><span className="font-medium">CTA: </span>{scriptData.cta}</p>}
              </CardContent>
            </Card>
          )}

          {finalVideo?.public_url && (
            <Card>
              <CardHeader>
                <CardTitle>Final video</CardTitle>
              </CardHeader>
              <CardContent>
                <video src={finalVideo.public_url} controls className="w-full max-w-xs rounded-lg border border-border" />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Publishing — {campaign.publish_to_all_connected ? "All connected channels" : `${campaign.target_channel_keys.length} selected channels`}</CardTitle>
              <CardDescription>Native API preferred, then approved third-party publisher, then human approval queue.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChannelsStatusTable jobs={publishJobs ?? []} onRetry={retryPublishJob} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start gap-2" variant="outline" disabled={pending !== null} onClick={() => run("script-generate")}>
                <Wand2 className="h-4 w-4" /> {pending === "script-generate" ? "Generating…" : "Generate Script"}
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline" disabled={pending !== null} onClick={() => run("presenter-generate")}>
                <Sparkles className="h-4 w-4" /> {pending === "presenter-generate" ? "Generating…" : "Generate Presenter"}
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline" disabled={pending !== null} onClick={() => run("video-generate")}>
                <PlayCircle className="h-4 w-4" /> {pending === "video-generate" ? "Generating…" : "Generate Video"}
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline" disabled={pending !== null} onClick={() => run("video-render")}>
                <RotateCw className="h-4 w-4" /> {pending === "video-render" ? "Rendering…" : "Render (brand + subtitles)"}
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline" disabled={pending !== null} onClick={() => run("video-qc")}>
                <CheckCircle2 className="h-4 w-4" /> {pending === "video-qc" ? "Checking…" : "Run Quality Control"}
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline" disabled={pending !== null} onClick={() => run("caption-generate")}>
                <Wand2 className="h-4 w-4" /> {pending === "caption-generate" ? "Generating…" : "Generate Captions"}
              </Button>
              <Separator className="my-2" />
              <Button className="w-full justify-start gap-2" disabled={pending !== null} onClick={() => run("campaign-approve")}>
                <CheckCircle2 className="h-4 w-4" /> Approve &amp; Schedule All
              </Button>
              <Button className="w-full justify-start gap-2" variant="success" disabled={pending !== null} onClick={() => run("social-publish")}>
                <Send className="h-4 w-4" /> {pending === "social-publish" ? "Publishing…" : "Publish Now"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated</span><span>{formatCurrency(campaign.total_estimated_cost)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Actual</span><span>{formatCurrency(campaign.total_actual_cost)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Quality profile</span><span>{campaign.quality_profile}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
