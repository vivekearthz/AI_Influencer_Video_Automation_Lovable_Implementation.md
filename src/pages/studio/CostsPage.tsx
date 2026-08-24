import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCostLedger, summarizeCostByOperation } from "@/hooks/useCostLedger";
import { useWorkspace } from "@/context/WorkspaceContext";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function CostsPage() {
  const { data: ledger, isLoading } = useCostLedger(30);
  const { automationSettings } = useWorkspace();
  const summary = summarizeCostByOperation(ledger ?? []);
  const total = summary.reduce((sum, s) => sum + s.total, 0);

  return (
    <div>
      <PageHeader title="Costs" description="Cost ledger across text, image, video, voice and publishing operations." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Last 30 days</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(total)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Max / video</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(automationSettings?.max_cost_per_video_usd)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Max / day</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(automationSettings?.max_daily_spend_usd)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Max / month</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(automationSettings?.max_monthly_spend_usd)}</CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>By operation</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Operation</TableHead><TableHead>Total</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((s) => (
                <TableRow key={s.operation}>
                  <TableCell className="capitalize">{s.operation.replace(/_/g, " ")}</TableCell>
                  <TableCell>{formatCurrency(s.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ledger</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ledger ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.provider}</TableCell>
                    <TableCell className="text-muted-foreground">{row.model ?? "—"}</TableCell>
                    <TableCell className="capitalize">{row.operation.replace(/_/g, " ")}</TableCell>
                    <TableCell>{row.units ? `${row.units} ${row.unit_type ?? ""}` : "—"}</TableCell>
                    <TableCell>{formatCurrency(row.actual_cost ?? row.estimated_cost)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
