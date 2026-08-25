import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { CampaignRow, SocialPublishJobRow } from "@/types/database";

export function useCampaigns() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["campaigns", currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<CampaignRow[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId],
    enabled: Boolean(campaignId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const active = ["script_pending", "generating", "rendering", "qc_pending", "publishing"];
      return status && active.includes(status) ? 4000 : false;
    },
    queryFn: async (): Promise<CampaignRow> => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("id", campaignId!).single();
      if (error) throw error;
      return data;
    },
  });
}

export interface CreateCampaignInput {
  workspace_id: string;
  name: string;
  objective?: string;
  product_name?: string;
  product_description?: string;
  target_audience?: string;
  language?: string;
  tone?: string;
  presenter_id?: string | null;
  brand_template_id?: string | null;
  style?: string;
  duration_seconds?: number;
  aspect_ratio?: CampaignRow["aspect_ratio"];
  quality_profile?: CampaignRow["quality_profile"];
  cta?: string;
  landing_url?: string;
  whatsapp_enabled?: boolean;
  email_enabled?: boolean;
  target_channel_keys?: string[];
  publish_to_all_connected?: boolean;
  scheduled_at?: string | null;
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("campaigns")
        .insert({ ...input, created_by: userRes.user?.id, status: "draft" })
        .select("*")
        .single();
      if (error) throw error;
      return data as CampaignRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useCampaignAssets(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-assets", campaignId],
    enabled: Boolean(campaignId),
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_assets")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCampaignJobs(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-jobs", campaignId],
    enabled: Boolean(campaignId),
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_generation_jobs")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface PublishJobWithAccount extends SocialPublishJobRow {
  social_accounts: { platform_key: string; account_name: string | null } | null;
}

export function useCampaignPublishJobs(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-publish-jobs", campaignId],
    enabled: Boolean(campaignId),
    refetchInterval: 5000,
    queryFn: async (): Promise<PublishJobWithAccount[]> => {
      const { data, error } = await supabase
        .from("social_publish_jobs")
        .select("*, social_accounts(platform_key, account_name)")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PublishJobWithAccount[];
    },
  });
}
