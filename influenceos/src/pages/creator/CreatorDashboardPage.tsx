import { Link } from "react-router-dom";
import { Star, Handshake, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import { useMyCollaborations } from "@/hooks/useCollaborations";
import { formatCurrency } from "@/lib/utils";

export function CreatorDashboardPage() {
  const { data: profile } = useCreatorProfile();
  const { data: collaborations } = useMyCollaborations();

  const active = (collaborations ?? []).filter((c) => !["cancelled", "paid"].includes(c.status));
  const earned = (collaborations ?? [])
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + (c.agreed_amount ?? 0), 0);

  return (
    <div>
      <PageHeader title="Your dashboard" description="Profile status, active collaborations, and earnings." />

      {!profile?.onboarding_completed && (
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Finish setting up your profile</AlertTitle>
          <AlertDescription>
            Brands can&apos;t discover you until your profile is complete.{" "}
            <Link to="/onboarding/creator" className="underline">Finish onboarding</Link>.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Star className="h-4 w-4" /> Rating</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {profile?.rating_avg ? profile.rating_avg.toFixed(1) : "—"} <span className="text-sm text-muted-foreground">({profile?.rating_count ?? 0})</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Handshake className="h-4 w-4" /> Active collabs</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{active.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> Total earned</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(earned)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent collaborations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!collaborations?.length ? (
            <p className="text-sm text-muted-foreground">No collaborations yet — brands will reach out once your profile is live.</p>
          ) : (
            collaborations.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to={`/collaboration/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm hover:bg-muted/40"
              >
                <span>{c.campaigns?.title ?? "Untitled campaign"}</span>
                <StatusBadge status={c.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Button asChild variant="outline">
          <Link to="/dashboard/creator/profile">Edit my profile</Link>
        </Button>
      </div>
    </div>
  );
}
