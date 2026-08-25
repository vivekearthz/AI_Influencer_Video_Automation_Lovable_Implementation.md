import * as React from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatorSearch } from "@/hooks/useCreatorSearch";
import type { AudienceType, ContentCategory, FollowerRange } from "@/types/database";

const CONTENT_CATEGORIES: ContentCategory[] = [
  "Fashion", "Beauty", "Food", "Travel", "Fitness", "Tech", "Education",
  "Entertainment", "Finance", "Gaming", "Motivation", "Comedy", "Photography", "UGC", "Other",
];
const AUDIENCE_TYPES: AudienceType[] = ["Students", "Working Professionals", "Entrepreneurs", "Creators", "Homemakers", "Mixed", "Other"];
const FOLLOWER_RANGES: FollowerRange[] = ["Below 1K", "1K-10K", "10K-50K", "50K-100K", "100K-500K", "500K+"];

export function DiscoverCreatorsPage() {
  const [category, setCategory] = React.useState<string>("");
  const [audience, setAudience] = React.useState<string>("");
  const [followerRange, setFollowerRange] = React.useState<string>("");
  const [city, setCity] = React.useState("");

  const { data: creators, isLoading } = useCreatorSearch({
    category: (category || undefined) as ContentCategory | undefined,
    audience: (audience || undefined) as AudienceType | undefined,
    followerRange: (followerRange || undefined) as FollowerRange | undefined,
    city: city || undefined,
  });

  return (
    <div>
      <PageHeader title="Discover creators" description="Filter by category, audience, follower range, and city." />

      <Card className="mb-6">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{CONTENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
            <SelectContent>{AUDIENCE_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={followerRange} onValueChange={setFollowerRange}>
            <SelectTrigger><SelectValue placeholder="Followers" /></SelectTrigger>
            <SelectContent>{FOLLOWER_RANGES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : !creators?.length ? (
        <p className="text-sm text-muted-foreground">No creators match these filters yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((c: any) => (
            <Card key={c.user_id}>
              <CardHeader>
                <CardTitle className="text-base">{c.profiles?.full_name ?? "Creator"}</CardTitle>
                <p className="text-sm text-muted-foreground">{c.profiles?.city}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 text-accent" />
                  {c.rating_avg ? Number(c.rating_avg).toFixed(1) : "New"} ({c.rating_count} reviews)
                </div>
                <div className="flex flex-wrap gap-1">
                  {(c.content_categories ?? []).slice(0, 3).map((cat: string) => (
                    <Badge key={cat} variant="outline">{cat}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{c.instagram_followers_range} followers · {c.avg_reel_views_range} avg reel views</p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/creator/${c.user_id}`}>View profile</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
