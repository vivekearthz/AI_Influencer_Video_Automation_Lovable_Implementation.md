// deno-lint-ignore-file no-explicit-any
import { getServiceClient } from "./supabaseClient.ts";

export async function writeAuditLog(input: {
  workspaceId: string | null;
  userId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getServiceClient();
  const { error } = await supabase.from("audit_logs").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId ?? null,
    action: input.action,
    resource_type: input.resourceType ?? null,
    resource_id: input.resourceId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    console.error("[audit] failed to write audit log", error);
  }
}

export async function recordCost(input: {
  workspaceId: string;
  campaignId?: string | null;
  jobId?: string | null;
  provider: string;
  model?: string | null;
  operation: string;
  units?: number | null;
  unitType?: string | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
}) {
  const supabase = getServiceClient();
  const { error } = await supabase.from("ai_cost_ledger").insert({
    workspace_id: input.workspaceId,
    campaign_id: input.campaignId ?? null,
    job_id: input.jobId ?? null,
    provider: input.provider,
    model: input.model ?? null,
    operation: input.operation,
    units: input.units ?? null,
    unit_type: input.unitType ?? "second",
    estimated_cost: input.estimatedCost ?? null,
    actual_cost: input.actualCost ?? null,
  });
  if (error) {
    console.error("[cost-ledger] failed to record cost", error);
  }
}
