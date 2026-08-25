import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "muted" | "outline"> = {
  draft: "muted",
  queued: "muted",
  script_pending: "warning",
  script_ready: "outline",
  processing: "warning",
  generating: "warning",
  rendering: "warning",
  qc_pending: "warning",
  qc_failed: "destructive",
  ready_for_review: "outline",
  ready: "outline",
  approved: "success",
  scheduled: "outline",
  publishing: "warning",
  completed: "success",
  published: "success",
  failed: "destructive",
  blocked: "destructive",
  cancelled: "muted",
  needs_review: "warning",
  needs_approval: "warning",
  retrying: "warning",
  connected: "success",
  disconnected: "muted",
  reauthorization_required: "warning",
  error: "destructive",
  pending: "warning",
  in_review: "warning",
  rejected: "destructive",
  healthy: "success",
  degraded: "warning",
  unhealthy: "destructive",
  not_configured: "muted",
  unknown: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "outline";
  return <Badge variant={variant}>{titleCase(status)}</Badge>;
}
