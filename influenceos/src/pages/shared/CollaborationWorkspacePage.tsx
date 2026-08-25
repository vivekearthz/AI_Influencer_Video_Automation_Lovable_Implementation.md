import * as React from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { FileText, ShieldCheck, Star, Upload, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { MessageThread } from "@/components/collaboration/MessageThread";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useCollaboration, useUpdateCollaborationStatus } from "@/hooks/useCollaborations";
import { useCollaborationReviews, useSubmitReview } from "@/hooks/useReviews";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export function CollaborationWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { data: collaboration, isLoading } = useCollaboration(id);
  const updateStatus = useUpdateCollaborationStatus();
  const { data: reviews } = useCollaborationReviews(id);
  const queryClient = useQueryClient();

  const [disputeReason, setDisputeReason] = React.useState("");
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const submitReview = useSubmitReview(id);

  if (isLoading || !collaboration) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const isCreator = profile?.role === "creator" && user?.id === collaboration.creator_id;
  const isBrand = profile?.role === "brand" && user?.id === collaboration.brand_id;
  const otherPartyId = isCreator ? collaboration.brand_id : collaboration.creator_id;
  const alreadyReviewed = (reviews ?? []).some((r) => r.rater_id === user?.id);

  async function invoke(name: string, extra?: Record<string, unknown>) {
    setBusy(name);
    try {
      const { data, error } = await supabase.functions.invoke(name, { body: { collaborationId: id, ...extra } });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Request failed");
      toast.success("Done");
      queryClient.invalidateQueries({ queryKey: ["collaboration", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to run ${name}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleFileUpload(file: File) {
    setBusy("upload");
    try {
      const path = `${collaboration!.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("content-deliveries").upload(path, file);
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("content-deliveries").createSignedUrl(path, 60 * 60 * 24 * 30);
      await updateStatus.mutateAsync({
        id: collaboration!.id,
        status: "content_submitted",
        extra: { content_delivery_url: signed?.signedUrl ?? path },
      });
      toast.success("Content submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Collaboration workspace"
        description="Messages, contract, delivery, and escrow — all in one place."
        actions={<StatusBadge status={collaboration.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex h-[520px] flex-col lg:col-span-2">
          <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <MessageThread collaborationId={collaboration.id} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Deal terms</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>{formatCurrency(collaboration.agreed_amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Usage rights</span><span>{collaboration.usage_rights_duration_days ? `${collaboration.usage_rights_duration_days} days` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Escrow</span><StatusBadge status={collaboration.escrow_status} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Contract</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {collaboration.contract_pdf_url ? (
                <a href={collaboration.contract_pdf_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                  View generated contract ↗
                </a>
              ) : (
                <>
                  <CardDescription>
                    Auto-generates deliverables, timeline, amount, an explicit usage-rights window, and an
                    ASCI-compliant disclosure clause.
                  </CardDescription>
                  {collaboration.status !== "invited" && isBrand && (
                    <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => invoke("contract-generate")}>
                      {busy === "contract-generate" ? "Generating…" : "Generate contract"}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {isCreator && collaboration.status === "invited" && (
                <Button className="w-full" disabled={busy !== null} onClick={() => updateStatus.mutateAsync({ id: collaboration.id, status: "accepted" })}>
                  Accept collaboration
                </Button>
              )}

              {isBrand && collaboration.status === "accepted" && collaboration.escrow_status === "none" && collaboration.agreed_amount ? (
                <Button className="w-full" variant="outline" disabled={busy !== null} onClick={() => invoke("escrow-fund")}>
                  {busy === "escrow-fund" ? "Redirecting…" : "Fund escrow"}
                </Button>
              ) : null}

              {isCreator && ["accepted", "negotiating"].includes(collaboration.status) && (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-muted/40">
                  <Upload className="h-4 w-4" />
                  {busy === "upload" ? "Uploading…" : "Submit content delivery"}
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                </label>
              )}

              {isBrand && collaboration.status === "content_submitted" && (
                <>
                  <Button className="w-full" variant="success" disabled={busy !== null} onClick={() => invoke("escrow-release")}>
                    {busy === "escrow-release" ? "Releasing…" : "Approve delivery & release escrow"}
                  </Button>
                  {collaboration.content_delivery_url && (
                    <a href={collaboration.content_delivery_url} target="_blank" rel="noreferrer" className="block text-center text-sm text-primary hover:underline">
                      View delivered content ↗
                    </a>
                  )}
                </>
              )}

              {["accepted", "negotiating", "content_submitted"].includes(collaboration.status) && (
                <div className="space-y-2 rounded-md border border-destructive/30 p-3">
                  <p className="flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3 w-3" /> Something wrong?</p>
                  <Textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Describe the issue…" className="text-sm" />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!disputeReason || busy !== null}
                    onClick={() =>
                      updateStatus.mutateAsync({
                        id: collaboration.id,
                        status: "disputed",
                        extra: { dispute_reason: disputeReason, dispute_raised_by: user?.id, dispute_raised_at: new Date().toISOString() },
                      })
                    }
                  >
                    Raise dispute
                  </Button>
                </div>
              )}

              {collaboration.status === "disputed" && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  This collaboration is under dispute. Escrowed funds stay held until our team resolves it.
                </p>
              )}
            </CardContent>
          </Card>

          {["approved", "paid"].includes(collaboration.status) && !alreadyReviewed && otherPartyId && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-4 w-4" /> Leave a review</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)}>
                      <Star className={n <= rating ? "h-5 w-5 fill-accent text-accent" : "h-5 w-5 text-muted-foreground"} />
                    </button>
                  ))}
                </div>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was this collaboration?" />
                <Button
                  size="sm"
                  onClick={() => submitReview.mutateAsync({ rateeId: otherPartyId, rating, comment }).then(() => toast.success("Review submitted"))}
                >
                  Submit review
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
