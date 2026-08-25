import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { SocialPostMetricsRow } from "@/types/database";

export interface SocialMetricWithJob extends SocialPostMetricsRow {
  social_publish_jobs: {
    workspace_id: string;
    campaign_id: string;
    social_accounts: { platform_key: string } | null;
  } | null;
}

export function useSocialMetrics() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["social-metrics", currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<SocialMetricWithJob[]> => {
      const { data, error } = await supabase
        .from("social_post_metrics")
        .select("*, social_publish_jobs!inner(workspace_id, campaign_id, social_accounts(platform_key))")
        .eq("social_publish_jobs.workspace_id", currentWorkspace!.id)
        .order("fetched_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SocialMetricWithJob[];
    },
  });
}
