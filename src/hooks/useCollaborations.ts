import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { CollaborationRow, CollaborationStatus } from "@/types/database";

export interface CollaborationWithParties extends CollaborationRow {
  campaigns: { title: string } | null;
  creator: { full_name: string | null } | null;
  brand: { company_name: string } | null;
}

export function useMyCollaborations() {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ["collaborations", user?.id, profile?.role],
    enabled: Boolean(user?.id && profile?.role),
    queryFn: async (): Promise<CollaborationWithParties[]> => {
      const column = profile?.role === "brand" ? "brand_id" : "creator_id";
      const { data, error } = await supabase
        .from("collaborations")
        .select("*, campaigns(title)")
        .eq(column, user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CollaborationWithParties[];
    },
  });
}

export function useCollaboration(collaborationId: string | undefined) {
  return useQuery({
    queryKey: ["collaboration", collaborationId],
    enabled: Boolean(collaborationId),
    refetchInterval: 10000,
    queryFn: async (): Promise<CollaborationRow> => {
      const { data, error } = await supabase.from("collaborations").select("*").eq("id", collaborationId!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCollaboration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { campaignId: string; creatorId: string; agreedAmount?: number; usageRightsDurationDays?: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("collaborations")
        .insert({
          campaign_id: input.campaignId,
          creator_id: input.creatorId,
          brand_id: user.id,
          status: "invited",
          agreed_amount: input.agreedAmount,
          usage_rights_duration_days: input.usageRightsDurationDays ?? 90,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as CollaborationRow;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collaborations"] }),
  });
}

export function useUpdateCollaborationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: CollaborationStatus; extra?: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("collaborations")
        .update({ status: input.status, ...input.extra })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collaborations"] });
      queryClient.invalidateQueries({ queryKey: ["collaboration", variables.id] });
    },
  });
}
