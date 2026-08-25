import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { PlatformCatalogRow, SocialAccountRow } from "@/types/database";

export function usePlatformCatalog() {
  return useQuery({
    queryKey: ["platform-catalog"],
    queryFn: async (): Promise<PlatformCatalogRow[]> => {
      const { data, error } = await supabase.from("platform_catalog").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSocialAccounts() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["social-accounts", currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<SocialAccountRow[]> => {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
}
