// Cost guardrail helpers (spec §23, §53).

import type { AutomationSettingsRow } from "@/types/database";

export interface SpendSnapshot {
  todaySpend: number;
  monthSpend: number;
}

export function isOverBudget(settings: AutomationSettingsRow, snapshot: SpendSnapshot, nextCost: number) {
  if (snapshot.todaySpend + nextCost > settings.max_daily_spend_usd) {
    return { blocked: true, reason: "Daily AI spend limit would be exceeded" };
  }
  if (snapshot.monthSpend + nextCost > settings.max_monthly_spend_usd) {
    return { blocked: true, reason: "Monthly AI spend limit would be exceeded" };
  }
  if (nextCost > settings.max_cost_per_video_usd) {
    return { blocked: true, reason: "Per-video cost limit would be exceeded" };
  }
  return { blocked: false, reason: null as string | null };
}

export function qualityProfileToVideoParams(profile: AutomationSettingsRow["default_quality_profile"]) {
  switch (profile) {
    case "premium":
      return { resolution: "1080p" as const, maxRetries: 3, modelRole: "fallback" as const };
    case "balanced":
      return { resolution: "1080p" as const, maxRetries: 2, modelRole: "fallback" as const };
    default:
      return { resolution: "720p" as const, maxRetries: 1, modelRole: "primary" as const };
  }
}
