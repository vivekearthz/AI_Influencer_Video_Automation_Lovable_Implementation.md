import { Link } from "react-router-dom";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaigns } from "@/hooks/useCampaigns";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Plus } from "lucide-react";

export function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns();

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Every AI video campaign — from brief to publish."
        actions={
          <Button asChild size="sm" className="gap-2">
            <Link to="/studio/create">
              <Plus className="h-4 w-4" /> New campaign
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !campaigns?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No campaigns yet. <Link to="/studio/create" className="text-primary hover:underline">Create your first one</Link>.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell>
                      <Link to={`/studio/campaigns/${c.id}`} className="font-medium hover:text-primary hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{c.product_name}</p>
                    </TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>{c.language}</TableCell>
                    <TableCell>{c.duration_seconds}s</TableCell>
                    <TableCell>{formatCurrency(c.total_actual_cost ?? c.total_estimated_cost)}</TableCell>
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
