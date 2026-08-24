import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceAssetsByType } from "@/hooks/useAssets";
import { formatDateTime } from "@/lib/utils";

export function ScriptsPage() {
  const { data: scripts, isLoading } = useWorkspaceAssetsByType("script");

  return (
    <div>
      <PageHeader title="Scripts" description="AI-generated scene-by-scene scripts across all campaigns." />
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !scripts?.length ? (
        <p className="text-sm text-muted-foreground">No scripts generated yet.</p>
      ) : (
        <div className="space-y-4">
          {scripts.map((asset) => {
            const meta = asset.metadata as { hook?: string; spoken_script?: string; cta?: string };
            return (
              <Card key={asset.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">{asset.campaigns?.name}</CardTitle>
                    <CardDescription>{formatDateTime(asset.created_at)}</CardDescription>
                  </div>
                  <StatusBadge status={asset.status} />
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {meta.hook && <p><span className="font-medium">Hook: </span>{meta.hook}</p>}
                  {meta.spoken_script && <p className="whitespace-pre-wrap text-muted-foreground">{meta.spoken_script}</p>}
                  {meta.cta && <p><span className="font-medium">CTA: </span>{meta.cta}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
