// Static fallback mirror of the `platform_catalog` table, used only for
// optimistic UI rendering before the live Supabase query resolves. The
// database is always the source of truth (spec §54: "should not require
// code changes" to add/remove a channel).

import type { PlatformCatalogRow } from "@/types/database";

export const PLATFORM_TIER_LABEL: Record<PlatformCatalogRow["publisher_tier"], string> = {
  native_api: "Native API",
  third_party: "Third-Party Publisher",
  manual: "Manual / Approval Queue",
};

export const PLATFORM_TIER_BADGE_VARIANT: Record<PlatformCatalogRow["publisher_tier"], "success" | "warning" | "muted"> = {
  native_api: "success",
  third_party: "warning",
  manual: "muted",
};
