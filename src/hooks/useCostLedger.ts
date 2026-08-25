import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { AICostLedgerRow } from "@/types/database";

export function useCostLedger(days = 30) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["cost-ledger", currentWorkspace?.id, days],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<AICostLedgerRow[]> => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("ai_cost_ledger")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function summarizeCostByOperation(rows: AICostLedgerRow[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const cost = row.actual_cost ?? row.estimated_cost ?? 0;
    totals.set(row.operation, (totals.get(row.operation) ?? 0) + cost);
  }
  return Array.from(totals.entries()).map(([operation, total]) => ({ operation, total }));
}
