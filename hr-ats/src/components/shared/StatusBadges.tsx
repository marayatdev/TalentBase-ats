import { Badge } from "@/components/ui/badge";
import { humanizeEnum } from "@/lib/utils";
import type { ApplicationStatus, JobStatus, ParseStatus, MatchRecommendation, ImportStatus } from "@/types/domain";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, "muted" | "success" | "secondary"> = {
    draft: "muted",
    open: "success",
    closed: "secondary",
  };
  return <Badge variant={map[status]}>{humanizeEnum(status)}</Badge>;
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const map: Record<ApplicationStatus, "success" | "danger" | "info" | "muted"> = {
    active: "info",
    hired: "success",
    rejected: "danger",
    withdrawn: "muted",
  };
  return <Badge variant={map[status]}>{humanizeEnum(status)}</Badge>;
}

export function ParseStatusBadge({ status }: { status: ParseStatus | null | undefined }) {
  if (!status) return <Badge variant="muted">Not uploaded</Badge>;
  const map: Record<ParseStatus, "muted" | "info" | "success" | "danger"> = {
    pending: "muted",
    processing: "info",
    completed: "success",
    failed: "danger",
  };
  return <Badge variant={map[status]}>{humanizeEnum(status)}</Badge>;
}

export function RecommendationBadge({ recommendation }: { recommendation: MatchRecommendation }) {
  const map: Record<MatchRecommendation, { variant: "success" | "info" | "warning" | "danger"; label: string }> = {
    strong_match: { variant: "success", label: "Strong Match" },
    potential_match: { variant: "info", label: "Potential Match" },
    weak_match: { variant: "warning", label: "Weak Match" },
    not_recommended: { variant: "danger", label: "Not Recommended" },
  };
  const cfg = map[recommendation];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function ImportStatusBadge({ status }: { status: ImportStatus }) {
  const map: Record<ImportStatus, "muted" | "success" | "danger" | "warning"> = {
    pending: "muted",
    completed: "success",
    failed: "danger",
    duplicate: "warning",
  };
  return <Badge variant={map[status]}>{humanizeEnum(status)}</Badge>;
}
