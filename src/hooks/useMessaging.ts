import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { EmailCampaignRow, WhatsAppCampaignRow } from "@/types/database";

export function useWhatsAppCampaigns() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-campaigns", currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<WhatsAppCampaignRow[]> => {
      const { data, error } = await supabase
        .from("whatsapp_campaigns")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEmailCampaigns() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["email-campaigns", currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<EmailCampaignRow[]> => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
