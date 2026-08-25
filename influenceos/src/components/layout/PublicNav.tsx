import { Link, NavLink } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const links = [
  { to: "/for-creators", label: "For Creators" },
  { to: "/for-brands", label: "For Brands" },
  { to: "/pricing", label: "Pricing" },
  { to: "/trust-and-compliance", label: "Trust & Compliance" },
  { to: "/faq", label: "FAQ" },
];

export function PublicNav() {
  const { user, profile } = useAuth();
  const dashboardHref = profile?.role === "brand" ? "/dashboard/brand" : profile?.role === "admin" ? "/admin" : "/dashboard/creator";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          InfluenceOS
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn("text-sm text-muted-foreground hover:text-foreground", isActive && "text-foreground font-medium")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link to={dashboardHref}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
