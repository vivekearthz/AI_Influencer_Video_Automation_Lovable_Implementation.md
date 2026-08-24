import { NavLink } from "react-router-dom";
import {
  Clapperboard,
  Users,
  FileText,
  Film,
  LayoutGrid,
  Send,
  MessageCircle,
  Mail,
  BarChart3,
  Cpu,
  Wallet,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/studio/create", label: "Create", icon: Sparkles },
  { to: "/studio/campaigns", label: "Campaigns", icon: LayoutGrid },
  { to: "/studio/scripts", label: "Scripts", icon: FileText },
  { to: "/studio/videos", label: "Videos", icon: Film },
  { to: "/studio/presenters", label: "Presenters", icon: Users },
  { to: "/studio/publishing", label: "Publishing", icon: Send },
  { to: "/studio/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/studio/email", label: "Email", icon: Mail },
  { to: "/studio/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/studio/providers", label: "Providers", icon: Cpu },
  { to: "/studio/costs", label: "Costs", icon: Wallet },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 flex-col border-r border-border bg-card/40 px-3 py-4 lg:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Clapperboard className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">AI Video Studio</p>
          <p className="text-[11px] text-muted-foreground">Campaign automation</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            isActive && "bg-primary/10 text-primary"
          )
        }
      >
        <Settings className="h-4 w-4" />
        Settings
      </NavLink>
    </aside>
  );
}
