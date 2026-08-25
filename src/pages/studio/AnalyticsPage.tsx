import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocialMetrics } from "@/hooks/useAnalytics";

export function AnalyticsPage() {
  const { data: metrics, isLoading } = useSocialMetrics();

  const totals = (metrics ?? []).reduce(
    (acc, m) => {
      acc.views += m.views ?? 0;
      acc.likes += m.likes ?? 0;
      acc.comments += m.comments ?? 0;
      acc.shares += m.shares ?? 0;
      acc.clicks += m.clicks ?? 0;
      return acc;
    },
    { views: 0, likes: 0, comments: 0, shares: 0, clicks: 0 }
  );

  return (
    <div>
      <PageHeader title="Analytics" description="Normalized metrics across every channel — not every platform exposes every field." />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !metrics?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No analytics synced yet. Metrics populate once <code>analytics_sync</code> jobs run against your published
            posts (see <code>supabase/functions/webhooks-social</code>).
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(totals).map(([key, value]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground">{key}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{value.toLocaleString()}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
