import { toast } from "sonner";
import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAdminDisputes, useResolveDispute } from "@/hooks/useAdmin";

export function AdminDisputesPage() {
  const { data: disputes, isLoading } = useAdminDisputes();
  const resolve = useResolveDispute();

  return (
    <div>
      <PageHeader title="Disputes" description="Escrowed funds stay held until you resolve each case manually." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !disputes?.length ? (
        <p className="text-sm text-muted-foreground">No open disputes.</p>
      ) : (
        <div className="space-y-4">
          {disputes.map((d: any) => (
            <Card key={d.id} className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base">{d.campaigns?.title ?? "Untitled campaign"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><span className="text-muted-foreground">Reason:</span> {d.dispute_reason}</p>
                <p><span className="text-muted-foreground">Raised at:</span> {formatDateTime(d.dispute_raised_at)}</p>
                <p><span className="text-muted-foreground">Escrow amount:</span> {formatCurrency(d.escrow_amount)}</p>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="success"
                    disabled={resolve.isPending}
                    onClick={() =>
                      resolve
                        .mutateAsync({ collaborationId: d.id, resolution: "release_to_creator" })
                        .then(() => toast.success("Released to creator"))
                    }
                  >
                    Release to creator
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={resolve.isPending}
                    onClick={() =>
                      resolve
                        .mutateAsync({ collaborationId: d.id, resolution: "refund_to_brand" })
                        .then(() => toast.success("Refunded to brand"))
                    }
                  >
                    Refund to brand
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
