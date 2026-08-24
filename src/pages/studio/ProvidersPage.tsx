import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIModels, useAIProviderCredentials, useAIProviders, useRunProviderHealthCheck } from "@/hooks/useProviders";
import { formatDateTime } from "@/lib/utils";

export function ProvidersPage() {
  const { data: providers, isLoading } = useAIProviders();
  const { data: credentials } = useAIProviderCredentials();
  const { data: models } = useAIModels();
  const healthCheck = useRunProviderHealthCheck();

  return (
    <div>
      <PageHeader
        title="Providers"
        description="Configured AI providers are discovered automatically. A provider only becomes usable once its secret is verified by a health check."
        actions={
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={healthCheck.isPending}
            onClick={async () => {
              try {
                await healthCheck.mutateAsync();
                toast.success("Health check complete");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Health check failed");
              }
            }}
          >
            <RefreshCw className={healthCheck.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Run health check
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configured providers</CardTitle>
          <CardDescription>Enable/disable and health status per workspace. Raw secrets are never exposed here.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Last check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(providers ?? []).map((p) => {
                  const cred = (credentials ?? []).find((c) => c.provider_id === p.id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.provider_name}</TableCell>
                      <TableCell><Badge variant="outline">{p.provider_type}</Badge></TableCell>
                      <TableCell><StatusBadge status={cred?.health_status ?? "not_configured"} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {cred?.last_health_check ? formatDateTime(cred.last_health_check) : "Never"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model registry</CardTitle>
          <CardDescription>Swap the default model for any capability without redeploying the app.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Capability</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(models ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.display_name ?? m.model_key}</TableCell>
                  <TableCell><Badge variant="outline">{m.capability}</Badge></TableCell>
                  <TableCell>{m.is_default ? <Badge variant="success">Default</Badge> : <Badge variant="muted">Fallback</Badge>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.cost_per_second != null ? `$${m.cost_per_second}/sec` : m.cost_per_unit != null ? `$${m.cost_per_unit}/${m.unit_type}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
