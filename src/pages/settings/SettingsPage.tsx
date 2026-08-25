import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import type { AutomationSettingsRow } from "@/types/database";

function useUpdateAutomationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AutomationSettingsRow> & { workspace_id: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("automation_settings")
        .update({ ...input, updated_by: userRes.user?.id })
        .eq("workspace_id", input.workspace_id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-settings"] }),
  });
}

export function SettingsPage() {
  const { currentWorkspace, automationSettings, currentRole } = useWorkspace();
  const update = useUpdateAutomationSettings();
  const { data: auditLogs } = useAuditLogs(30);

  const isAdmin = currentRole === "owner" || currentRole === "admin";

  if (!currentWorkspace || !automationSettings) {
    return <p className="text-sm text-muted-foreground">Loading workspace settings…</p>;
  }

  async function toggle(field: keyof AutomationSettingsRow, value: boolean) {
    try {
      await update.mutateAsync({ workspace_id: currentWorkspace!.id, [field]: value });
      toast.success("Updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update setting");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description={`Workspace: ${currentWorkspace.name}`} />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" /> Emergency controls
          </CardTitle>
          <CardDescription>Immediately pause automation workspace-wide. Mandatory for a multi-channel automation system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            ["video_generation_paused", "Pause all video generation"],
            ["social_publishing_paused", "Pause all social publishing"],
            ["whatsapp_paused", "Pause WhatsApp"],
            ["email_paused", "Pause email"],
          ] as const).map(([field, label]) => (
            <div key={field} className="flex items-center justify-between">
              <Label htmlFor={field}>{label}</Label>
              <Switch
                id={field}
                disabled={!isAdmin}
                checked={Boolean(automationSettings[field])}
                onCheckedChange={(v) => toggle(field, v)}
              />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Label htmlFor="third_party_publishing_enabled">Allow third-party publisher fallback</Label>
            <Switch
              id="third_party_publishing_enabled"
              disabled={!isAdmin}
              checked={automationSettings.third_party_publishing_enabled}
              onCheckedChange={(v) => toggle("third_party_publishing_enabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost guardrails</CardTitle>
          <CardDescription>Generation pauses automatically and requests approval once a limit would be exceeded.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Max cost / video (USD)</Label>
            <Input
              type="number"
              defaultValue={automationSettings.max_cost_per_video_usd}
              disabled={!isAdmin}
              onBlur={(e) => update.mutate({ workspace_id: currentWorkspace.id, max_cost_per_video_usd: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max daily spend (USD)</Label>
            <Input
              type="number"
              defaultValue={automationSettings.max_daily_spend_usd}
              disabled={!isAdmin}
              onBlur={(e) => update.mutate({ workspace_id: currentWorkspace.id, max_daily_spend_usd: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max monthly spend (USD)</Label>
            <Input
              type="number"
              defaultValue={automationSettings.max_monthly_spend_usd}
              disabled={!isAdmin}
              onBlur={(e) => update.mutate({ workspace_id: currentWorkspace.id, max_monthly_spend_usd: Number(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Every generation, approval, provider change and publish action is recorded.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(auditLogs ?? []).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="capitalize">{log.action.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-muted-foreground">{log.resource_type ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
