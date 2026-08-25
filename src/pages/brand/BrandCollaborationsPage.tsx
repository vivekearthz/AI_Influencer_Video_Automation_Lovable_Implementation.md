import { Link } from "react-router-dom";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyCollaborations } from "@/hooks/useCollaborations";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function BrandCollaborationsPage() {
  const { data: collaborations, isLoading } = useMyCollaborations();

  return (
    <div>
      <PageHeader title="Collaborations" description="Every creator collaboration across all your campaigns." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : !collaborations?.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No collaborations yet — invite a creator from Discover.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Escrow</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collaborations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to={`/collaboration/${c.id}`} className="font-medium hover:text-primary hover:underline">
                        {c.campaigns?.title ?? "Untitled campaign"}
                      </Link>
                    </TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>{formatCurrency(c.agreed_amount)}</TableCell>
                    <TableCell><StatusBadge status={c.escrow_status} /></TableCell>
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
