import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminUsers, useToggleVerified } from "@/hooks/useAdmin";
import { formatDateTime } from "@/lib/utils";

export function AdminUsersPage() {
  const { data: users, isLoading } = useAdminUsers();
  const toggleVerified = useToggleVerified();

  return (
    <div>
      <PageHeader title="Users" description="All creators, brands, and admins on the platform." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{u.role}</Badge></TableCell>
                    <TableCell>
                      <Switch checked={u.verified_bool} onCheckedChange={(v) => toggleVerified.mutate({ userId: u.id, verified: v })} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(u.created_at)}</TableCell>
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
