import { Sparkles, ShieldAlert, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RecommendationBadge } from "@/components/shared/StatusBadges";
import { EmptyState } from "@/components/shared/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAIJobMatch, useRunAIJobMatch } from "@/hooks/useAIJobMatches";

interface AIJobMatchPanelProps {
  applicationId: string;
  disabled?: boolean;
  disabledReason?: string;
  showRunButton?: boolean;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[var(--color-ink)]/60">{label}</span>
        <span className="font-medium text-[var(--color-ink)]">{value}</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

export function AIJobMatchPanel({ applicationId, disabled = false, disabledReason, showRunButton = true }: AIJobMatchPanelProps) {
  const { data: match, isLoading, isError } = useAIJobMatch(applicationId);
  const runMatch = useRunAIJobMatch(applicationId);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
            AI job match
          </CardTitle>

          {disabled && disabledReason && (
            <p className="mt-1 text-xs text-red-600">
              {disabledReason}
            </p>
          )}
        </div>

        {showRunButton && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (!applicationId) {
                toast.error("Application is not selected");
                return;
              }

              runMatch.mutate(undefined, {
                onSuccess: () => {
                  toast.success(
                    "AI match analysis completed",
                  );
                },

                onError: (error) => {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not run AI match",
                  );
                },
              });
            }}
            disabled={
              disabled ||
              runMatch.isPending ||
              !applicationId
            }
          >
            {runMatch.isPending
              ? "Analyzing..."
              : match
                ? "Re-run analysis"
                : "Run AI match"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {isLoading && <p className="text-sm text-[var(--color-ink)]/50">Loading AI match…</p>}

        {!isLoading && (isError || !match) && (
          <EmptyState icon={HelpCircle} title="No AI match yet" description="Run AI matching to see how this candidate compares against the job requirements." />
        )}

        {match && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[var(--color-primary)]/15 text-lg font-semibold text-[var(--color-ink)]">
                {match.overall_score}
              </div>
              <div>
                <RecommendationBadge recommendation={match.recommendation} />
                <p className="mt-1 text-xs text-[var(--color-ink)]/50">Overall match score</p>
              </div>
            </div>

            <p className="text-sm text-[var(--color-ink)]/75">{match.summary}</p>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ScoreBar label="Skills" value={match.skill_score} />
              <ScoreBar label="Experience" value={match.experience_score} />
              <ScoreBar label="Education" value={match.education_score} />
              <ScoreBar label="Language" value={match.language_score} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">Matched skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {match.matched_skills.map((s) => <Badge key={s} variant="success">{s}</Badge>)}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">Missing required</p>
                <div className="flex flex-wrap gap-1.5">
                  {match.missing_required_skills.length > 0
                    ? match.missing_required_skills.map((s) => <Badge key={s} variant="danger">{s}</Badge>)
                    : <span className="text-xs text-[var(--color-ink)]/40">None</span>}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">Additional skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {match.additional_skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Strengths</p>
                <ul className="space-y-1 text-sm text-[var(--color-ink)]/75">
                  {match.strengths.map((s, i) => <li key={i}>· {s}</li>)}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45"><XCircle className="h-3.5 w-3.5 text-red-500" /> Concerns</p>
                <ul className="space-y-1 text-sm text-[var(--color-ink)]/75">
                  {match.concerns.map((s, i) => <li key={i}>· {s}</li>)}
                </ul>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">
                Skill detail
              </p>

              {match.skill_details.length === 0 ? (
                <p className="text-sm text-[var(--color-ink)]/45">
                  No skill details available.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Importance</TableHead>
                      <TableHead>Matched</TableHead>
                      <TableHead>Evidence</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {match.skill_details.map((row, index) => (
                      <TableRow key={`${row.name}-${index}`}>
                        <TableCell className="font-medium text-[var(--color-ink)]">
                          {row.name}
                        </TableCell>

                        <TableCell>
                          {row.importance === "required" ? (
                            <Badge variant="outline">
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="muted">
                              Optional
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {row.matched ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>

                        <TableCell className="max-w-md whitespace-normal text-[var(--color-ink)]/60">
                          {row.candidate_evidence ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">
                Suggested interview questions
              </p>

              {match.interview_questions.length > 0 ? (
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[var(--color-ink)]/75">
                  {match.interview_questions.map((question, index) => (
                    <li key={`${question}-${index}`}>
                      {question}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-[var(--color-ink)]/45">
                  No suggested interview questions.
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              AI matching is an advisory tool. Final hiring decisions must be made by authorized HR staff.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
