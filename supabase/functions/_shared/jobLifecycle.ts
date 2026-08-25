// deno-lint-ignore-file no-explicit-any
import { getServiceClient } from "./supabaseClient.ts";
import { buildIdempotencyKey, findExistingJob } from "./idempotency.ts";

export interface StartJobInput {
  workspaceId: string;
  campaignId: string;
  jobType: string;
  provider?: string;
  model?: string;
  requestPayload?: Record<string, unknown>;
  maxAttempts?: number;
  idempotencySuffix?: string;
}

/**
 * Creates (or reuses) a generation job row and marks it `processing`.
 * Returns `{ job, alreadyCompleted }` — callers should short-circuit and
 * return the prior result when `alreadyCompleted` is true (spec §33).
 */
export async function startJob(input: StartJobInput) {
  const supabase = getServiceClient();
  const idempotencyKey = buildIdempotencyKey(input.campaignId, input.jobType, input.idempotencySuffix);

  const existing = await findExistingJob(idempotencyKey);
  if (existing && existing.status === "completed") {
    return { job: existing, alreadyCompleted: true };
  }

  if (existing && ["queued", "processing"].includes(existing.status)) {
    return { job: existing, alreadyCompleted: false, alreadyRunning: true };
  }

  const attempt = existing ? existing.attempt + 1 : 1;

  const { data, error } = await supabase
    .from("ai_generation_jobs")
    .upsert(
      {
        workspace_id: input.workspaceId,
        campaign_id: input.campaignId,
        job_type: input.jobType,
        provider: input.provider,
        model: input.model,
        idempotency_key: idempotencyKey,
        status: "processing",
        attempt,
        max_attempts: input.maxAttempts ?? 2,
        request_payload: input.requestPayload ?? {},
        started_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return { job: data, alreadyCompleted: false, alreadyRunning: false };
}

export async function completeJob(jobId: string, input: { responsePayload?: Record<string, unknown>; actualCost?: number }) {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("ai_generation_jobs")
    .update({
      status: "completed",
      response_payload: input.responsePayload ?? {},
      actual_cost: input.actualCost,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw error;
}

export async function failJob(jobId: string, errorMessage: string, opts: { needsReview?: boolean } = {}) {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("ai_generation_jobs")
    .update({
      status: opts.needsReview ? "needs_review" : "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw error;
}
