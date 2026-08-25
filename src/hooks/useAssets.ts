import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { CampaignAssetRow } from "@/types/database";

interface AssetWithCampaign extends CampaignAssetRow {
  campaigns: { name: string; status: string } | null;
}

export function useWorkspaceAssetsByType(assetType: CampaignAssetRow["asset_type"]) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-assets", currentWorkspace?.id, assetType],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<AssetWithCampaign[]> => {
      const { data, error } = await supabase
        .from("campaign_assets")
        .select("*, campaigns!inner(name, status, workspace_id)")
        .eq("asset_type", assetType)
        .eq("campaigns.workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AssetWithCampaign[];
    },
  });
}
