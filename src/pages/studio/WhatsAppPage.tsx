import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useWhatsAppCampaigns } from "@/hooks/useMessaging";
import { formatDateTime } from "@/lib/utils";

export function WhatsAppPage() {
  const { data: campaigns, isLoading } = useWhatsAppCampaigns();

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description="Sent via the official WhatsApp Business Cloud API — never through WhatsApp Web password automation."
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !campaigns?.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No WhatsApp campaigns yet. Enable WhatsApp on a campaign in Create.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Read</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.template_name ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>{c.sent_count}</TableCell>
                    <TableCell>{c.delivered_count}</TableCell>
                    <TableCell>{c.read_count}</TableCell>
                    <TableCell>{c.failed_count}</TableCell>
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
