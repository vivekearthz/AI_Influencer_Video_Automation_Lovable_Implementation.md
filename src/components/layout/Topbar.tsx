import { LogOut, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Topbar() {
  const { user, signOut } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspaceId, automationSettings } = useWorkspace();
  const navigate = useNavigate();

  const anyPaused =
    automationSettings &&
    (automationSettings.video_generation_paused ||
      automationSettings.social_publishing_paused ||
      automationSettings.whatsapp_paused ||
      automationSettings.email_paused);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/30 px-4">
      <div className="flex items-center gap-3">
        {workspaces.length > 0 ? (
          <Select value={currentWorkspace?.id} onValueChange={setCurrentWorkspaceId}>
            <SelectTrigger className="h-8 w-56">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((w) => (
                <SelectItem key={w.workspace.id} value={w.workspace.id}>
                  {w.workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">No workspace yet</span>
        )}

        {anyPaused && (
          <Badge variant="warning" className="gap-1">
            <ShieldAlert className="h-3 w-3" /> Automation paused
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{(user?.email ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
