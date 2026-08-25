// deno-lint-ignore-file no-explicit-any
import { getServiceClient } from "./supabaseClient.ts";

export interface BudgetCheckResult {
  blocked: boolean;
  reason: string | null;
}

/**
 * Cost guardrails (spec §23, §53). Called before any billable generation
 * step. If the next generation would exceed a limit, the caller should mark
 * the job as `needs_review` and stop rather than spend the money anyway.
 */
export async function checkBudget(workspaceId: string, nextCostUsd: number): Promise<BudgetCheckResult> {
  const supabase = getServiceClient();

  const { data: settings, error: settingsError } = await supabase
    .from("automation_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (settingsError) throw settingsError;
  if (!settings) return { blocked: false, reason: null };

  if (nextCostUsd > settings.max_cost_per_video_usd) {
    return { blocked: true, reason: `Per-video cost limit ($${settings.max_cost_per_video_usd}) would be exceeded` };
  }

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfDay);
  startOfMonth.setUTCDate(1);

  const { data: dayRows, error: dayError } = await supabase
    .from("ai_cost_ledger")
    .select("estimated_cost, actual_cost")
    .eq("workspace_id", workspaceId)
    .gte("created_at", startOfDay.toISOString());
  if (dayError) throw dayError;

  const { data: monthRows, error: monthError } = await supabase
    .from("ai_cost_ledger")
    .select("estimated_cost, actual_cost")
    .eq("workspace_id", workspaceId)
    .gte("created_at", startOfMonth.toISOString());
  if (monthError) throw monthError;

  const sum = (rows: any[]) => rows.reduce((acc, r) => acc + (r.actual_cost ?? r.estimated_cost ?? 0), 0);
  const todaySpend = sum(dayRows ?? []);
  const monthSpend = sum(monthRows ?? []);

  if (todaySpend + nextCostUsd > settings.max_daily_spend_usd) {
    return { blocked: true, reason: `Daily AI spend limit ($${settings.max_daily_spend_usd}) would be exceeded` };
  }
  if (monthSpend + nextCostUsd > settings.max_monthly_spend_usd) {
    return { blocked: true, reason: `Monthly AI spend limit ($${settings.max_monthly_spend_usd}) would be exceeded` };
  }

  return { blocked: false, reason: null };
}

export async function getAutomationSettings(workspaceId: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("automation_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
