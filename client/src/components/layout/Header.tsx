import { Menu, Bell, Search } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { Breadcrumbs } from "./Breadcrumbs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function Header() {
  const { setMobileSidebarOpen } = useUIStore();
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-black/[0.06] bg-white px-4">
      <button
        className="rounded-md p-1.5 text-[var(--color-ink)]/70 hover:bg-black/[0.04] lg:hidden"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block">
        <Breadcrumbs />
      </div>

      <div className="relative ml-auto w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink)]/35" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && search.trim()) {
              navigate(`/candidates?search=${encodeURIComponent(search.trim())}`);
            }
          }}
          placeholder="Search candidates, jobs…"
          aria-label="Global search"
          className="h-9 w-full rounded-md border border-black/10 bg-[var(--color-canvas)] pl-8 pr-3 text-sm placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
        />
      </div>

      <button
        className="relative rounded-md p-2 text-[var(--color-ink)]/70 hover:bg-black/[0.04]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-accent)]" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user?.name)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <p className="truncate">{user?.name}</p>
            <p className="truncate text-[11px] font-normal capitalize text-[var(--color-ink)]/50">{user?.role}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings")}>Account settings</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings/browser-extension")}>Browser extension</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout.mutate()}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
