import { Link, useNavigate } from "react-router-dom";
import { LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

export function AppTopbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/30 px-4">
      <Link to="/" className="flex items-center gap-2 font-semibold">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        InfluenceOS
        {profile?.role && <Badge variant="outline" className="ml-2 capitalize">{profile.role}</Badge>}
      </Link>

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
