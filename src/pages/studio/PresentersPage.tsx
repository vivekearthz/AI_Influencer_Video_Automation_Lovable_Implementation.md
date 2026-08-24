import * as React from "react";
import { toast } from "sonner";
import { Plus, User } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useCreatePresenter, usePresenters } from "@/hooks/usePresenters";
import type { PresenterSourceType } from "@/types/database";

export function PresentersPage() {
  const { data: presenters, isLoading } = usePresenters();
  const { currentWorkspace } = useWorkspace();
  const createPresenter = useCreatePresenter();
  const [open, setOpen] = React.useState(false);

  const [form, setForm] = React.useState({
    name: "",
    style: "",
    sourceType: "generated" as PresenterSourceType,
    consentConfirmed: false,
  });

  const needsConsent = form.sourceType === "user_uploaded" || form.sourceType === "employee";

  async function handleCreate() {
    if (!currentWorkspace) return;
    if (needsConsent && !form.consentConfirmed) {
      toast.error("Consent confirmation is required for uploaded/employee presenters.");
      return;
    }
    try {
      await createPresenter.mutateAsync({
        workspace_id: currentWorkspace.id,
        name: form.name,
        style: form.style,
        source_type: form.sourceType,
        consent_confirmed: form.consentConfirmed,
      });
      toast.success("Presenter added");
      setOpen(false);
      setForm({ name: "", style: "", sourceType: "generated", consentConfirmed: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add presenter");
    }
  }

  return (
    <div>
      <PageHeader
        title="Presenter library"
        description="Reusable AI presenter personas. Real-person likenesses require explicit consent before generation."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> New presenter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New presenter</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Female 01 — Corporate" />
                </div>
                <div className="space-y-1.5">
                  <Label>Style</Label>
                  <Input value={form.style} onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))} placeholder="Corporate, Real Estate, Startup…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select value={form.sourceType} onValueChange={(v) => setForm((f) => ({ ...f, sourceType: v as PresenterSourceType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generated">AI-generated (no real person)</SelectItem>
                      <SelectItem value="licensed_stock">Licensed stock talent</SelectItem>
                      <SelectItem value="user_uploaded">User-uploaded photo</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="client">Client-provided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {needsConsent && (
                  <label className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                    <Checkbox checked={form.consentConfirmed} onCheckedChange={(v) => setForm((f) => ({ ...f, consentConfirmed: Boolean(v) }))} />
                    I confirm this person has given explicit consent to be used as an AI presenter and this is not
                    intended to impersonate anyone without authorization.
                  </label>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={createPresenter.isPending}>
                  {createPresenter.isPending ? "Saving…" : "Save presenter"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : !presenters?.length ? (
        <p className="text-sm text-muted-foreground">No presenters yet — add one or let a campaign auto-generate one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presenters.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.reference_image_url ?? undefined} />
                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{p.style ?? "—"}</p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                <Badge variant="outline">{p.source_type.replace(/_/g, " ")}</Badge>
                <Badge variant={p.status === "available" ? "success" : "muted"}>{p.status}</Badge>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                {p.languages?.length ? p.languages.join(", ") : "Language not set"}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
