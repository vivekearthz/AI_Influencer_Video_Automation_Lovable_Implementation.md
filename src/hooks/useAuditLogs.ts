import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { AuditLogRow } from "@/types/database";

export function useAuditLogs(limit = 50) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["audit-logs", currentWorkspace?.id, limit],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<AuditLogRow[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}
