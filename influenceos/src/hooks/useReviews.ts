import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { ReviewRow } from "@/types/database";

export function useCollaborationReviews(collaborationId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", collaborationId],
    enabled: Boolean(collaborationId),
    queryFn: async (): Promise<ReviewRow[]> => {
      const { data, error } = await supabase.from("reviews").select("*").eq("collaboration_id", collaborationId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubmitReview(collaborationId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { rateeId: string; rating: number; comment?: string }) => {
      if (!user || !collaborationId) throw new Error("Not authenticated");
      const { error } = await supabase.from("reviews").insert({
        collaboration_id: collaborationId,
        rater_id: user.id,
        ratee_id: input.rateeId,
        rating: input.rating,
        comment: input.comment,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews", collaborationId] }),
  });
}
