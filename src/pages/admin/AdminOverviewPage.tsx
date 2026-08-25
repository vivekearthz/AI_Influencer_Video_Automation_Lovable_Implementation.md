import { Link } from "react-router-dom";
import { Users, Building2, Megaphone, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminOverview } from "@/hooks/useAdmin";

export function AdminOverviewPage() {
  const { data } = useAdminOverview();

  return (
    <div>
      <PageHeader title="Admin overview" description="Platform-wide moderation and operations." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Creators</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.creators ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" /> Brands</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.brands ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Megaphone className="h-4 w-4" /> Campaigns</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.campaigns ?? 0}</CardContent>
        </Card>
        <Card className={data?.disputes ? "border-destructive/40" : undefined}>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldAlert className="h-4 w-4" /> Open disputes</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {data?.disputes ?? 0}
            {Boolean(data?.disputes) && (
              <Link to="/admin/disputes" className="ml-2 text-xs text-primary hover:underline">Review →</Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
