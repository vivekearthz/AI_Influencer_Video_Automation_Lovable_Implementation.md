import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmailCampaigns } from "@/hooks/useMessaging";
import { formatDateTime } from "@/lib/utils";

export function EmailPage() {
  const { data: campaigns, isLoading } = useEmailCampaigns();

  return (
    <div>
      <PageHeader title="Email" description="Sent via your configured transactional email provider." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !campaigns?.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No email campaigns yet. Enable email on a campaign in Create.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Clicked</TableHead>
                  <TableHead>Bounced</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.subject ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>{c.sent_count}</TableCell>
                    <TableCell>{c.opened_count}</TableCell>
                    <TableCell>{c.clicked_count}</TableCell>
                    <TableCell>{c.bounced_count}</TableCell>
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
