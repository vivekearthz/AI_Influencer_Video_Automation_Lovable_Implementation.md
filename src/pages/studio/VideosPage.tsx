import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceAssetsByType } from "@/hooks/useAssets";
import { formatDateTime } from "@/lib/utils";
import { Link } from "react-router-dom";

export function VideosPage() {
  const { data: videos, isLoading } = useWorkspaceAssetsByType("final_video");

  return (
    <div>
      <PageHeader title="Videos" description="Final rendered videos, ready for QC and publishing." />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : !videos?.length ? (
        <p className="text-sm text-muted-foreground">No rendered videos yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((asset) => (
            <Card key={asset.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">{asset.campaigns?.name}</CardTitle>
                <StatusBadge status={asset.status} />
              </CardHeader>
              <CardContent>
                {asset.public_url ? (
                  <video src={asset.public_url} controls className="aspect-[9/16] w-full rounded-md border border-border object-cover" />
                ) : (
                  <div className="flex aspect-[9/16] w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    Not ready
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDateTime(asset.created_at)}</span>
                <Link to={`/studio/campaigns/${asset.campaign_id}`} className="text-primary hover:underline">
                  Open campaign
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
