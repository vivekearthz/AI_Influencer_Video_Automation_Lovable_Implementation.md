import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { AIModelRow, AIProviderCredentialRow, AIProviderRow } from "@/types/database";

export function useAIProviders() {
  return useQuery({
    queryKey: ["ai-providers"],
    queryFn: async (): Promise<AIProviderRow[]> => {
      const { data, error } = await supabase.from("ai_providers").select("*").order("priority", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAIModels() {
  return useQuery({
    queryKey: ["ai-models"],
    queryFn: async (): Promise<AIModelRow[]> => {
      const { data, error } = await supabase.from("ai_models").select("*").order("capability", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAIProviderCredentials() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["ai-provider-credentials", currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<AIProviderCredentialRow[]> => {
      const { data, error } = await supabase
        .from("ai_provider_credentials")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRunProviderHealthCheck() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("provider-health-check", {
        body: { workspaceId: currentWorkspace?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-provider-credentials"] });
      queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
    },
  });
}
