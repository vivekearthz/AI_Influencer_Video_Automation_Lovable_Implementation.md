import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformCatalog, useSocialAccounts } from "@/hooks/useSocial";
import { useApprovalTasks, useResolveApprovalTask } from "@/hooks/useApprovalTasks";
import { PLATFORM_TIER_BADGE_VARIANT, PLATFORM_TIER_LABEL } from "@/services/social/platform-catalog";
import { formatDateTime } from "@/lib/utils";

function ChannelMatrix() {
  const { data: platforms, isLoading } = usePlatformCatalog();
  const { data: accounts } = useSocialAccounts();

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Publisher</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Connection status</TableHead>
              <TableHead>Last check</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(platforms ?? []).map((platform) => {
              const account = (accounts ?? []).find((a) => a.platform_key === platform.platform_key);
              return (
                <TableRow key={platform.platform_key}>
                  <TableCell className="font-medium">{platform.display_name}</TableCell>
                  <TableCell>
                    <Badge variant={PLATFORM_TIER_BADGE_VARIANT[platform.publisher_tier]}>
                      {PLATFORM_TIER_LABEL[platform.publisher_tier]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {Object.entries(platform.capabilities)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(", ")}
                  </TableCell>
                  <TableCell>
                    {account ? <StatusBadge status={account.status} /> : <Badge variant="muted">Not connected</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {account?.last_health_check ? formatDateTime(account.last_health_check) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ApprovalQueue() {
  const { data: tasks, isLoading } = useApprovalTasks("pending");
  const resolve = useResolveApprovalTask();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!tasks?.length) return <p className="text-sm text-muted-foreground">Nothing needs approval right now.</p>;

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{task.channel ?? "Unknown channel"}</p>
              <p className="text-sm text-muted-foreground">Reason: {task.reason}</p>
              {task.caption && <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">{task.caption}</p>}
            </div>
            <div className="flex gap-2">
              {task.asset_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={task.asset_url} target="_blank" rel="noreferrer">Open channel</a>
                </Button>
              )}
              <Button
                size="sm"
                variant="success"
                onClick={async () => {
                  await resolve.mutateAsync({ id: task.id, status: "published" });
                  toast.success("Marked as published");
                }}
              >
                Mark Published
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await resolve.mutateAsync({ id: task.id, status: "rejected" });
                  toast.info("Rejected");
                }}
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PublishingPage() {
  return (
    <div>
      <PageHeader title="Publishing" description="24-channel router: native APIs first, then approved third-party publishers, then human approval." />
      <Tabs defaultValue="channels">
        <TabsList>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="approvals">Approval queue</TabsTrigger>
        </TabsList>
        <TabsContent value="channels"><ChannelMatrix /></TabsContent>
        <TabsContent value="approvals"><ApprovalQueue /></TabsContent>
      </Tabs>
    </div>
  );
}
