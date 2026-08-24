import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useBrandCampaigns } from "@/hooks/useCampaigns";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function CampaignsPage() {
  const { data: campaigns, isLoading } = useBrandCampaigns();

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Every campaign you've created."
        actions={
          <Button asChild size="sm" className="gap-2">
            <Link to="/campaign/new"><Plus className="h-4 w-4" /> New campaign</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : !campaigns?.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No campaigns yet. <Link to="/campaign/new" className="text-primary hover:underline">Create your first one</Link>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-muted-foreground">{c.category ?? "—"}</TableCell>
                    <TableCell>{c.budget_type === "barter" ? "Barter" : formatCurrency(c.budget_amount)}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(c.created_at)}</TableCell>
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
