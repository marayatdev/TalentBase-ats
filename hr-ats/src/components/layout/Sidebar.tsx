import { NavLink } from "react-router-dom";
import { ChevronsLeft, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-config";
import { useUIStore } from "@/store/ui.store";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const { user } = useAuth();
  const logout = useLogout();

  const content = (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center gap-2 border-b border-black/[0.06] px-4", sidebarCollapsed && "justify-center px-2")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        {!sidebarCollapsed && <span className="text-sm font-semibold text-[var(--color-ink)]">TalentBase HR</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-ink)]/70 hover:bg-black/[0.04] hover:text-[var(--color-ink)]",
                sidebarCollapsed && "justify-center px-2"
              )
            }
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={cn("border-t border-black/[0.06] p-3", sidebarCollapsed && "px-1.5")}>
        <div className={cn("flex items-center gap-2 rounded-md px-1.5 py-2", sidebarCollapsed && "justify-center")}>
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user?.name)}</AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--color-ink)]">{user?.name}</p>
              <p className="truncate text-[11px] capitalize text-[var(--color-ink)]/50">{user?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => logout.mutate()}
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-ink)]/70 transition-colors hover:bg-black/[0.04]",
            sidebarCollapsed && "justify-center px-2"
          )}
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
          {!sidebarCollapsed && "Log out"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative hidden shrink-0 border-r border-black/[0.06] bg-white transition-all duration-200 lg:block",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {content}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white text-[var(--color-ink)]/60 shadow-sm hover:text-[var(--color-ink)]"
          aria-label="Toggle sidebar"
        >
          <ChevronsLeft className={cn("h-3.5 w-3.5 transition-transform", sidebarCollapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
