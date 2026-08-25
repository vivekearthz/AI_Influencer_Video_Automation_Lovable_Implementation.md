import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AudienceType, ContentCategory, FollowerRange } from "@/types/database";

export interface CreatorSearchFilters {
  category?: ContentCategory;
  audience?: AudienceType;
  followerRange?: FollowerRange;
  city?: string;
  collabType?: string;
}

export function useCreatorSearch(filters: CreatorSearchFilters) {
  return useQuery({
    queryKey: ["creator-search", filters],
    queryFn: async () => {
      let query = supabase
        .from("creator_profiles")
        .select("*, profiles!inner(id, full_name, city, verified_bool)")
        .eq("onboarding_completed", true)
        .order("rating_avg", { ascending: false });

      if (filters.category) query = query.contains("content_categories", [filters.category]);
      if (filters.audience) query = query.contains("audience_type", [filters.audience]);
      if (filters.followerRange) query = query.eq("instagram_followers_range", filters.followerRange);
      if (filters.collabType) query = query.contains("collab_types_open_to", [filters.collabType]);
      if (filters.city) query = query.ilike("profiles.city", `%${filters.city}%`);

      const { data, error } = await query.limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });
}
