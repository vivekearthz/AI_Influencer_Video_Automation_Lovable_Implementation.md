import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { AutomationSettingsRow, WorkspaceRole, WorkspaceRow } from "@/types/database";

interface WorkspaceMembership {
  workspace: WorkspaceRow;
  role: WorkspaceRole;
}

interface WorkspaceContextValue {
  workspaces: WorkspaceMembership[];
  currentWorkspace: WorkspaceRow | null;
  currentRole: WorkspaceRole | null;
  automationSettings: AutomationSettingsRow | null;
  isLoading: boolean;
  setCurrentWorkspaceId: (id: string) => void;
  refetch: () => void;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY = "ai-video-studio:current-workspace-id";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = React.useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_STORAGE_KEY) : null
  );

  const membershipsQuery = useQuery({
    queryKey: ["workspace-memberships", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<WorkspaceMembership[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("role, workspace:workspaces(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<{ role: WorkspaceRole; workspace: WorkspaceRow | null }>;
      return rows
        .filter((row) => row.workspace)
        .map((row) => ({ workspace: row.workspace as WorkspaceRow, role: row.role }));
    },
  });

  const workspaces = React.useMemo(() => membershipsQuery.data ?? [], [membershipsQuery.data]);

  React.useEffect(() => {
    if (!currentWorkspaceId && workspaces.length > 0) {
      setCurrentWorkspaceIdState(workspaces[0].workspace.id);
    }
  }, [workspaces, currentWorkspaceId]);

  const setCurrentWorkspaceId = React.useCallback((id: string) => {
    setCurrentWorkspaceIdState(id);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, id);
  }, []);

  const currentWorkspace =
    workspaces.find((w) => w.workspace.id === currentWorkspaceId)?.workspace ?? workspaces[0]?.workspace ?? null;
  const currentRole =
    workspaces.find((w) => w.workspace.id === currentWorkspaceId)?.role ?? workspaces[0]?.role ?? null;

  const automationSettingsQuery = useQuery({
    queryKey: ["automation-settings", currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id),
    queryFn: async (): Promise<AutomationSettingsRow | null> => {
      const { data, error } = await supabase
        .from("automation_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const refetch = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["workspace-memberships"] });
    queryClient.invalidateQueries({ queryKey: ["automation-settings"] });
  }, [queryClient]);

  const value = React.useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      currentWorkspace,
      currentRole,
      automationSettings: automationSettingsQuery.data ?? null,
      isLoading: membershipsQuery.isLoading,
      setCurrentWorkspaceId,
      refetch,
    }),
    [workspaces, currentWorkspace, currentRole, automationSettingsQuery.data, membershipsQuery.isLoading, setCurrentWorkspaceId, refetch]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
