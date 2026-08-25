import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { BrandProfileRow } from "@/types/database";

export function useBrandProfile(userId?: string) {
  const { user } = useAuth();
  const targetId = userId ?? user?.id;

  return useQuery({
    queryKey: ["brand-profile", targetId],
    enabled: Boolean(targetId),
    queryFn: async (): Promise<BrandProfileRow | null> => {
      const { data, error } = await supabase.from("brand_profiles").select("*").eq("user_id", targetId!).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useUpsertBrandProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<BrandProfileRow> & { company_name: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("brand_profiles")
        .upsert({ user_id: user.id, ...input }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data as BrandProfileRow;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand-profile"] }),
  });
}
