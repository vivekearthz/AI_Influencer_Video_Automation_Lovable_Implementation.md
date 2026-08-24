import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { PresenterRow, VoiceProfileRow } from "@/types/database";

export function usePresenters() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["presenters", currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<PresenterRow[]> => {
      const { data, error } = await supabase
        .from("presenters")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVoiceProfiles() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["voice-profiles", currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<VoiceProfileRow[]> => {
      const { data, error } = await supabase
        .from("voice_profiles")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface CreatePresenterInput {
  workspace_id: string;
  name: string;
  style?: string;
  age_range?: string;
  clothing_style?: string;
  languages?: string[];
  reference_image_url?: string;
  voice_profile_id?: string | null;
  source_type: PresenterRow["source_type"];
  consent_confirmed: boolean;
}

export function useCreatePresenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePresenterInput) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("presenters")
        .insert({ ...input, created_by: userRes.user?.id })
        .select("*")
        .single();
      if (error) throw error;
      return data as PresenterRow;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["presenters"] }),
  });
}
