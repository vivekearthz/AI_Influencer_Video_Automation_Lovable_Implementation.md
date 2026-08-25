import { Link } from "react-router-dom";
import { Megaphone, Handshake, Wallet, Search } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBrandProfile } from "@/hooks/useBrandProfile";
import { useBrandCampaigns } from "@/hooks/useCampaigns";
import { useMyCollaborations } from "@/hooks/useCollaborations";
import { formatCurrency } from "@/lib/utils";

export function BrandDashboardPage() {
  const { data: brand } = useBrandProfile();
  const { data: campaigns } = useBrandCampaigns();
  const { data: collaborations } = useMyCollaborations();

  const heldEscrow = (collaborations ?? [])
    .filter((c) => c.escrow_status === "held")
    .reduce((sum, c) => sum + (c.escrow_amount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={brand?.company_name ? `${brand.company_name} dashboard` : "Dashboard"}
        description="Your campaigns, collaborations, and escrow status at a glance."
        actions={
          <Button asChild size="sm" className="gap-2">
            <Link to="/campaign/new"><Megaphone className="h-4 w-4" /> New campaign</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Megaphone className="h-4 w-4" /> Campaigns</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{campaigns?.length ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Handshake className="h-4 w-4" /> Collaborations</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{collaborations?.length ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" /> Held in escrow</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(heldEscrow)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent campaigns</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!campaigns?.length ? (
              <p className="text-sm text-muted-foreground">
                No campaigns yet. <Link to="/campaign/new" className="text-primary hover:underline">Create one</Link>.
              </p>
            ) : (
              campaigns.slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <span>{c.title}</span>
                  <StatusBadge status={c.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Discover creators</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Search and filter by category, audience, follower range, and collab type — matched by engagement
              quality, not just follower count.
            </p>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/dashboard/brand/discover"><Search className="h-4 w-4" /> Browse creators</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
