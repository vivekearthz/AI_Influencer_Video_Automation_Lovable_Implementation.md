import { Link } from "react-router-dom";
import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";

export function CreatorProfilePage() {
  const { profile } = useAuth();
  const { data } = useCreatorProfile();

  return (
    <div>
      <PageHeader
        title="My profile"
        description="This is what brands see when they discover you."
        actions={<Button asChild variant="outline"><Link to="/onboarding/creator">Edit profile</Link></Button>}
      />

      <Card>
        <CardHeader>
          <CardTitle>{profile?.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><span className="text-muted-foreground">City:</span> {profile?.city ?? "—"}</div>
            <div><span className="text-muted-foreground">Instagram:</span> {data?.instagram_url ?? "—"}</div>
            <div><span className="text-muted-foreground">Followers:</span> {data?.instagram_followers_range ?? "—"}</div>
            <div><span className="text-muted-foreground">Avg reel views:</span> {data?.avg_reel_views_range ?? "—"}</div>
          </div>

          <div>
            <p className="mb-1 text-muted-foreground">Content categories</p>
            <div className="flex flex-wrap gap-1">
              {(data?.content_categories ?? []).map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
            </div>
          </div>

          <div>
            <p className="mb-1 text-muted-foreground">Collab types open to</p>
            <div className="flex flex-wrap gap-1">
              {(data?.collab_types_open_to ?? []).map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
            </div>
          </div>

          {data?.portfolio_files?.length ? (
            <div>
              <p className="mb-2 text-muted-foreground">Portfolio</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {data.portfolio_files.map((f) => (
                  <a key={f.storage_path} href={f.public_url} target="_blank" rel="noreferrer" className="truncate rounded-md border border-border p-2 text-xs hover:bg-muted/40">
                    {f.file_name}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
