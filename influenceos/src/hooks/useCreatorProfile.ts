import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { CreatorProfileRow } from "@/types/database";

export function useCreatorProfile(userId?: string) {
  const { user } = useAuth();
  const targetId = userId ?? user?.id;

  return useQuery({
    queryKey: ["creator-profile", targetId],
    enabled: Boolean(targetId),
    queryFn: async (): Promise<CreatorProfileRow | null> => {
      const { data, error } = await supabase.from("creator_profiles").select("*").eq("user_id", targetId!).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useUpsertCreatorProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<CreatorProfileRow>) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("creator_profiles")
        .upsert({ user_id: user.id, ...input }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data as CreatorProfileRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-profile"] });
    },
  });
}
