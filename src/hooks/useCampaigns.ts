import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { CampaignRow } from "@/types/database";

export function useBrandCampaigns() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["brand-campaigns", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<CampaignRow[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("brand_id", user!.id)
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
    queryFn: async (): Promise<CampaignRow> => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("id", campaignId!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<Partial<CampaignRow>, "id" | "brand_id" | "created_at" | "updated_at"> & { title: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("campaigns")
        .insert({ ...input, brand_id: user.id })
        .select("*")
        .single();
      if (error) throw error;
      return data as CampaignRow;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand-campaigns"] }),
  });
}
