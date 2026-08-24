// -----------------------------------------------------------------------------
// Render worker (spec §25-27, §32). Supabase Edge Functions cannot shell out
// to ffmpeg, so this small Node process is deployed separately (Docker,
// Fly.io, Railway, a VM, etc.) and polls `ai_generation_jobs` for
// job_type = 'render' rows queued by the `video-render` Edge Function.
//
// Run locally:   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run start
// Run in prod:   docker build -t render-worker . && docker run --env-file .env render-worker
// -----------------------------------------------------------------------------
import path from "node:path";
import { promises as fs } from "node:fs";
import { supabase } from "./supabase.js";
import { applyBrandOverlay, burnSubtitles, concatScenes, downloadToFile, makeTempDir } from "./ffmpeg.js";
import { buildSrtFromScript } from "./subtitles.js";

const POLL_INTERVAL_MS = Number(process.env.RENDER_WORKER_POLL_INTERVAL_MS ?? 5000);

interface RenderJob {
  id: string;
  workspace_id: string;
  campaign_id: string;
  request_payload: {
    sceneAssetUrls: string[];
    brandTemplate: null | {
      logo_url?: string;
      overlay_config?: { logo?: { position?: string } };
    };
    cta?: string;
    landingUrl?: string;
    aspectRatio: string;
  };
}

async function claimNextJob(): Promise<RenderJob | null> {
  const { data, error } = await supabase
    .from("ai_generation_jobs")
    .select("*")
    .eq("job_type", "render")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("[render-worker] failed to query jobs", error);
    return null;
  }
  const job = data?.[0] as RenderJob | undefined;
  if (!job) return null;

  const { error: claimError } = await supabase
    .from("ai_generation_jobs")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("status", "queued");

  if (claimError) {
    console.error("[render-worker] failed to claim job", claimError);
    return null;
  }
  return job;
}

async function processJob(job: RenderJob) {
  const workDir = await makeTempDir("render-worker-");
  console.log(`[render-worker] processing job ${job.id} for campaign ${job.campaign_id}`);

  try {
    const { sceneAssetUrls, brandTemplate, cta, landingUrl } = job.request_payload;
    if (!sceneAssetUrls?.length) throw new Error("No scene asset URLs in render job payload");

    const sceneFiles: string[] = [];
    for (let i = 0; i < sceneAssetUrls.length; i++) {
      const dest = path.join(workDir, `scene-${i}.mp4`);
      await downloadToFile(sceneAssetUrls[i], dest);
      sceneFiles.push(dest);
    }

    const concatenated = path.join(workDir, "concatenated.mp4");
    await concatScenes(sceneFiles, concatenated, workDir);

    let logoPath: string | undefined;
    if (brandTemplate?.logo_url) {
      logoPath = path.join(workDir, "logo.png");
      await downloadToFile(brandTemplate.logo_url, logoPath);
    }

    const branded = path.join(workDir, "branded.mp4");
    await applyBrandOverlay(concatenated, branded, {
      logoPath,
      logoPosition: (brandTemplate?.overlay_config?.logo?.position as any) ?? "top-right",
      ctaText: cta,
      websiteText: landingUrl,
    });

    // Pull the script for subtitle text (best-effort; render still succeeds without it).
    const { data: scriptAsset } = await supabase
      .from("campaign_assets")
      .select("metadata")
      .eq("campaign_id", job.campaign_id)
      .eq("asset_type", "script")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const spokenScript = (scriptAsset?.metadata as any)?.spoken_script as string | undefined;
    let finalPath = branded;
    let srtPath: string | undefined;

    if (spokenScript) {
      const approxDuration = sceneFiles.length * 8;
      const srt = buildSrtFromScript(spokenScript, approxDuration);
      if (srt) {
        srtPath = path.join(workDir, "captions.srt");
        await fs.writeFile(srtPath, srt);
        const withSubs = path.join(workDir, "final.mp4");
        await burnSubtitles(branded, srtPath, withSubs);
        finalPath = withSubs;
      }
    }

    const finalBuffer = await fs.readFile(finalPath);
    const finalStoragePath = `${job.workspace_id}/${job.campaign_id}/final-${Date.now()}.mp4`;
    const { error: uploadError } = await supabase.storage.from("rendered-video").upload(finalStoragePath, finalBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from("rendered-video").getPublicUrl(finalStoragePath);

    await supabase.from("campaign_assets").insert({
      campaign_id: job.campaign_id,
      asset_type: "final_video",
      storage_path: finalStoragePath,
      public_url: publicUrlData.publicUrl,
      provider: "ffmpeg",
      status: "ready",
    });

    if (srtPath) {
      const srtBuffer = await fs.readFile(srtPath);
      const srtStoragePath = `${job.workspace_id}/${job.campaign_id}/captions-${Date.now()}.srt`;
      await supabase.storage.from("subtitles").upload(srtStoragePath, srtBuffer, { contentType: "text/plain", upsert: true });
      const { data: srtUrlData } = supabase.storage.from("subtitles").getPublicUrl(srtStoragePath);
      await supabase.from("campaign_assets").insert({
        campaign_id: job.campaign_id,
        asset_type: "subtitle",
        storage_path: srtStoragePath,
        public_url: srtUrlData.publicUrl,
        status: "ready",
      });
    }

    await supabase
      .from("ai_generation_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString(), response_payload: { finalVideoUrl: publicUrlData.publicUrl } })
      .eq("id", job.id);

    await supabase.from("campaigns").update({ status: "qc_pending" }).eq("id", job.campaign_id);

    await supabase.from("audit_logs").insert({
      workspace_id: job.workspace_id,
      action: "video_rendered",
      resource_type: "campaign",
      resource_id: job.campaign_id,
      metadata: { jobId: job.id },
    });

    console.log(`[render-worker] completed job ${job.id}`);
  } catch (error) {
    console.error(`[render-worker] job ${job.id} failed`, error);
    await supabase
      .from("ai_generation_jobs")
      .update({ status: "failed", error_message: error instanceof Error ? error.message : String(error), completed_at: new Date().toISOString() })
      .eq("id", job.id);
    await supabase.from("campaigns").update({ status: "failed" }).eq("id", job.campaign_id);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function pollLoop() {
  console.log(`[render-worker] started, polling every ${POLL_INTERVAL_MS}ms`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const job = await claimNextJob();
      if (job) {
        await processJob(job);
        continue; // check immediately for another queued job
      }
    } catch (err) {
      console.error("[render-worker] poll loop error", err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

pollLoop();
