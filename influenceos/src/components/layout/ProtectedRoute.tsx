import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { UserRole } from "@/types/database";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) return <Outlet />;

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
}

export function RoleRoute({ allow }: { allow: UserRole[] }) {
  const { profile, loading } = useAuth();

  if (!isSupabaseConfigured) return <Outlet />;
  if (loading) return null;
  if (profile && !allow.includes(profile.role)) {
    const fallback = profile.role === "brand" ? "/dashboard/brand" : profile.role === "admin" ? "/admin" : "/dashboard/creator";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
