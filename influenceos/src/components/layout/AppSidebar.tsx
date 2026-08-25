import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Megaphone,
  Handshake,
  User,
  ShieldAlert,
  Users,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const CREATOR_LINKS = [
  { to: "/dashboard/creator", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/creator/collaborations", label: "Collaborations", icon: Handshake },
  { to: "/dashboard/creator/profile", label: "My Profile", icon: User },
];

const BRAND_LINKS = [
  { to: "/dashboard/brand", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/brand/discover", label: "Discover Creators", icon: Search },
  { to: "/dashboard/brand/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/dashboard/brand/collaborations", label: "Collaborations", icon: Handshake },
  { to: "/dashboard/brand/billing", label: "Billing", icon: Receipt },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/disputes", label: "Disputes", icon: ShieldAlert },
];

export function AppSidebar() {
  const { profile } = useAuth();
  const links = profile?.role === "brand" ? BRAND_LINKS : profile?.role === "admin" ? ADMIN_LINKS : CREATOR_LINKS;

  return (
    <aside className="hidden w-56 flex-col border-r border-border bg-card/40 px-3 py-4 lg:flex">
      <nav className="flex flex-1 flex-col gap-0.5">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
