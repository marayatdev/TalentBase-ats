import { UserPlus, Globe, Mail, Users, Share2, Link2 } from "lucide-react";
import type { CandidateSource } from "@/types/domain";

const config: Record<CandidateSource, { icon: typeof Globe; className: string }> = {
  facebook: { icon: Share2, className: "text-[#1877F2]" },
  linkedin: { icon: Link2, className: "text-[#0A66C2]" },
  manual: { icon: UserPlus, className: "text-[var(--color-ink)]/60" },
  website: { icon: Globe, className: "text-[var(--color-primary)]" },
  email: { icon: Mail, className: "text-[var(--color-accent)]" },
  referral: { icon: Users, className: "text-[var(--color-ink)]/60" },
};

export function SourceIcon({ source, className = "h-4 w-4" }: { source: CandidateSource; className?: string }) {
  const cfg = config[source] ?? config.manual;
  const Icon = cfg.icon;
  return <Icon className={`${className} ${cfg.className}`} />;
}
