import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/database";

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [{ count: creators }, { count: brands }, { count: campaigns }, { count: disputes }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "creator"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "brand"),
        supabase.from("campaigns").select("id", { count: "exact", head: true }),
        supabase.from("collaborations").select("id", { count: "exact", head: true }).eq("status", "disputed"),
      ]);
      return {
        creators: creators ?? 0,
        brands: brands ?? 0,
        campaigns: campaigns ?? 0,
        disputes: disputes ?? 0,
      };
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleVerified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; verified: boolean }) => {
      const { error } = await supabase.from("profiles").update({ verified_bool: input.verified }).eq("id", input.userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useAdminDisputes() {
  return useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborations")
        .select("*, campaigns(title)")
        .eq("status", "disputed")
        .order("dispute_raised_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { collaborationId: string; resolution: "release_to_creator" | "refund_to_brand" }) => {
      const { data, error } = await supabase.functions.invoke("dispute-resolve", { body: input });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Failed to resolve dispute");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}
