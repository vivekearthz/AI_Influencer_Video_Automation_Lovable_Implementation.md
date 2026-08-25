import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { ApprovalTaskRow } from "@/types/database";

export function useApprovalTasks(status?: ApprovalTaskRow["status"]) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["approval-tasks", currentWorkspace?.id, status ?? "all"],
    enabled: Boolean(currentWorkspace?.id),
    refetchInterval: 8000,
    queryFn: async (): Promise<ApprovalTaskRow[]> => {
      let query = supabase.from("approval_tasks").select("*").eq("workspace_id", currentWorkspace!.id);
      if (status) query = query.eq("status", status);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useResolveApprovalTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: ApprovalTaskRow["status"]; resolution_notes?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("approval_tasks")
        .update({
          status: input.status,
          resolution_notes: input.resolution_notes,
          resolved_by: userRes.user?.id,
          approved_at: input.status === "approved" || input.status === "published" ? new Date().toISOString() : null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approval-tasks"] }),
  });
}
