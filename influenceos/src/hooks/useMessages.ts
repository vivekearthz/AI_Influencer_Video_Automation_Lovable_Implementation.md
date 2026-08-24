import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { MessageRow } from "@/types/database";

export function useMessages(collaborationId: string | undefined) {
  return useQuery({
    queryKey: ["messages", collaborationId],
    enabled: Boolean(collaborationId),
    refetchInterval: 5000,
    queryFn: async (): Promise<MessageRow[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("collaboration_id", collaborationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSendMessage(collaborationId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (body: string) => {
      if (!user || !collaborationId) throw new Error("Not authenticated");
      const { error } = await supabase.from("messages").insert({
        collaboration_id: collaborationId,
        sender_id: user.id,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", collaborationId] }),
  });
}
