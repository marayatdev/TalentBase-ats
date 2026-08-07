import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { Sparkles } from "lucide-react";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, finishChecking } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Simulate an auth check pass on first mount (persisted session already
    // hydrated by zustand at this point).
    const timeout = setTimeout(() => finishChecking(), 250);
    return () => clearTimeout(timeout);
  }, [finishChecking]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-[var(--color-canvas)]">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="text-sm text-[var(--color-ink)]/50">Checking your session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
