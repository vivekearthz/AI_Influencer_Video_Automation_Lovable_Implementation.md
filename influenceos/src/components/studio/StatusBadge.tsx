import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "muted" | "outline"> = {
  draft: "muted",
  open: "success",
  in_review: "warning",
  closed: "muted",
  invited: "outline",
  negotiating: "warning",
  accepted: "outline",
  content_submitted: "warning",
  approved: "success",
  paid: "success",
  disputed: "destructive",
  cancelled: "muted",
  none: "muted",
  held: "warning",
  released: "success",
  refunded: "muted",
  pending: "warning",
  in_progress: "warning",
  resolved: "success",
  active: "success",
  trialing: "outline",
  past_due: "destructive",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "outline";
  return <Badge variant={variant}>{titleCase(status)}</Badge>;
}
