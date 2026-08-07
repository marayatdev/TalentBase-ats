import { useNavigate } from "react-router-dom";
import { Globe, User, Bell, Shield, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/utils";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const sections = [
    { icon: User, label: "Account", description: "Your name, email, and role", onClick: undefined },
    { icon: Bell, label: "Notifications", description: "Email and in-app alert preferences", onClick: undefined },
    { icon: Shield, label: "Security", description: "Password and session management", onClick: undefined },
    { icon: Globe, label: "Browser Extension", description: "Connect the HR Candidate Importer extension", onClick: () => navigate("/settings/browser-extension") },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Settings" description="Manage your account and platform preferences." />

      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <Avatar className="h-12 w-12"><AvatarFallback className="text-base">{initials(user?.name)}</AvatarFallback></Avatar>
          <div>
            <p className="font-medium text-[var(--color-ink)]">{user?.name}</p>
            <p className="text-sm text-[var(--color-ink)]/55">{user?.email}</p>
            <p className="text-xs capitalize text-[var(--color-ink)]/45">{user?.role}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-black/[0.06] p-0">
          {sections.map((s) => (
            <button
              key={s.label}
              onClick={s.onClick}
              disabled={!s.onClick}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-black/[0.02] disabled:cursor-default disabled:hover:bg-transparent"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-muted)]">
                <s.icon className="h-4 w-4 text-[var(--color-primary)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-ink)]">{s.label}</p>
                <p className="text-xs text-[var(--color-ink)]/50">{s.description}</p>
              </div>
              {s.onClick && <ChevronRight className="h-4 w-4 text-[var(--color-ink)]/30" />}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
