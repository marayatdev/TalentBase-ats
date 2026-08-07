import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/10 bg-white/60 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
        <Icon className="h-5 w-5 text-[var(--color-primary)]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
        {description && <p className="mt-1 max-w-sm text-xs text-[var(--color-ink)]/55">{description}</p>}
      </div>
      {action}
    </div>
  );
}
