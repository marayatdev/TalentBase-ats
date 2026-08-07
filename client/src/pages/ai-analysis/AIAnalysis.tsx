import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useRunAIJobMatch } from "@/hooks/useAIJobMatches";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ParseStatusBadge } from "@/components/shared/StatusBadges";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  useAIResumeResult,
  useParseResume,
} from "@/hooks/useAIResumes";
import { normalizeError } from "@/api/axios";
import { formatDateTime } from "@/lib/utils";
import {
  BriefcaseBusiness,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { AIJobMatchPanel } from "@/components/shared/AIJobMatchPanel";

const POLLING_INTERVAL_MS = 3_000;

export default function AIAnalysisPage() {
  const navigate = useNavigate();
  const [
    params,
    setParams,
  ] = useSearchParams();

  const [
    selectedApplicationId,
    setSelectedApplicationId,
  ] = useState("");

  const resumeId =
    params.get("resumeId")?.trim() ?? "";

  const [
    input,
    setInput,
  ] = useState(resumeId);

  const [
    showRawText,
    setShowRawText,
  ] = useState(false);

  const {
    data: result,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useAIResumeResult(
    resumeId || undefined,
  );

  const parseResume =
    useParseResume(resumeId);

  const runJobMatch =
    useRunAIJobMatch(
      selectedApplicationId,
    );

  /*
   * Synchronize the input when resumeId in the URL changes.
   */
  useEffect(() => {
    setInput(resumeId);
    setShowRawText(false);
  }, [resumeId]);

  /*
   * Poll every three seconds while AI is processing.
   */
  useEffect(() => {
    if (
      !resumeId ||
      result?.status !== "processing"
    ) {
      return;
    }

    const intervalId =
      window.setInterval(() => {
        void refetch();
      }, POLLING_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    resumeId,
    result?.status,
    refetch,
  ]);


  useEffect(() => {
    const applications =
      result?.applications ?? [];

    if (applications.length === 0) {
      setSelectedApplicationId("");
      return;
    }

    setSelectedApplicationId((current) => {
      const stillExists =
        applications.some(
          (application) =>
            application.id === current,
        );

      if (stillExists) {
        return current;
      }

      return applications[0].id;
    });
  }, [result?.applications]);

  async function handleLoadResume(): Promise<void> {
    const normalizedResumeId = input.trim();

    if (!normalizedResumeId) {
      toast.error("Please enter a resume ID");
      return;
    }

    if (!/^[1-9]\d*$/.test(normalizedResumeId)) {
      toast.error("Resume ID must be a positive number");
      return;
    }

    setShowRawText(false);

    if (normalizedResumeId === resumeId) {
      const response = await refetch();

      if (response.isError) {
        toast.error(
          normalizeError(response.error).message,
        );
        return;
      }

      toast.success("Resume loaded");
      return;
    }

    setParams({
      resumeId: normalizedResumeId,
    });
  }

  function handleParseResume(): void {
    if (!resumeId) {
      toast.error(
        "Please select a resume first",
      );

      return;
    }

    parseResume.mutate(
      undefined,
      {
        onSuccess: async () => {
          toast.success(
            result?.status === "failed"
              ? "AI parsing restarted"
              : "AI resume analysis completed",
          );

          await refetch();
        },

        onError: (
          mutationError,
        ) => {
          toast.error(
            normalizeError(
              mutationError,
            ).message,
          );
        },
      },
    );
  }

  const isParsing =
    parseResume.isPending ||
    result?.status === "processing";

  const applications =
    result?.applications ?? [];

  const selectedApplication =
    applications.find(
      (application) =>
        application.id === selectedApplicationId,
    ) ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Resume Analysis"
        description="Review AI-extracted candidate data before making recruitment decisions."
      />

      <Card>
        <CardContent className="p-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              handleLoadResume();
            }}
          >
            <Input
              placeholder="Enter a resume ID, for example 1"
              value={input}
              inputMode="numeric"
              onChange={(event) => {
                setInput(
                  event.target.value,
                );
              }}
              className="sm:max-w-sm"
            />

            <Button
              type="submit"
              variant="outline"
              disabled={
                !input.trim()
              }
            >
              Load resume
            </Button>
          </form>
        </CardContent>
      </Card>

      {!resumeId && (
        <EmptyState
          icon={Sparkles}
          title="No resume selected"
          description="Enter a resume ID above, or open AI Analysis from a candidate's Resume tab."
        />
      )}

      {resumeId && (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />

              Resume #{resumeId}
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              {result && (
                <ParseStatusBadge
                  status={
                    result.status
                  }
                />
              )}

              {isFetching &&
                !isLoading && (
                  <RefreshCcw className="h-4 w-4 animate-spin text-[var(--color-ink)]/40" />
                )}

              <Button
                type="button"
                size="sm"
                variant={
                  result?.status ===
                    "failed"
                    ? "default"
                    : "outline"
                }
                onClick={
                  handleParseResume
                }
                disabled={
                  !resumeId ||
                  parseResume.isPending ||
                  result?.status ===
                  "processing"
                }
              >
                {parseResume.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw
                    className={`h-4 w-4 ${result?.status ===
                      "processing"
                      ? "animate-spin"
                      : ""
                      }`}
                  />
                )}

                {result?.status ===
                  "failed"
                  ? "Retry parsing"
                  : result?.status ===
                    "completed"
                    ? "Re-run analysis"
                    : result?.status ===
                      "processing"
                      ? "Analyzing..."
                      : "Start AI parsing"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-0">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading resume analysis...
              </div>
            )}

            {!isLoading &&
              isError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                  <div>
                    <p className="font-medium">
                      Could not load resume analysis
                    </p>

                    <p className="mt-1 text-xs">
                      {
                        normalizeError(
                          error,
                        ).message
                      }
                    </p>
                  </div>
                </div>
              )}

            {!isLoading &&
              result?.status ===
              "processing" && (
                <div className="flex items-center gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">
                  <RefreshCcw className="h-4 w-4 animate-spin" />

                  <span>
                    AI is parsing this resume.
                    The result will refresh
                    automatically.
                  </span>
                </div>
              )}

            {!isLoading &&
              result?.status ===
              "failed" && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                  <div>
                    <p className="font-medium">
                      Resume analysis failed
                    </p>

                    <p className="mt-1">
                      {result.error_message ??
                        "Try again or upload a different file."}
                    </p>
                  </div>
                </div>
              )}

            {!isLoading &&
              result?.status ===
              "completed" && (
                <>
                  <section className="rounded-xl border border-black/10 bg-[var(--color-primary)]/5 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <SectionTitle>
                          Resume Summary
                        </SectionTitle>

                        <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]/80">
                          {result.summary ||
                            "No summary was generated."}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          onClick={() =>
                            navigate(
                              `/candidates/${result.candidate_id}`,
                            )
                          }
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Match Jobs
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() =>
                            navigate(
                              `/candidates/${result.candidate_id}`,
                            )
                          }
                        >
                          View Candidate
                        </Button>
                      </div>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <section className="rounded-lg border border-black/[0.06] p-4">
                      <SectionTitle>
                        Extracted profile
                      </SectionTitle>

                      <dl className="space-y-2 text-sm">
                        <InfoRow
                          label="Name"
                          value={
                            result
                              .extracted_profile
                              ?.full_name
                          }
                        />

                        <InfoRow
                          label="Email"
                          value={
                            result
                              .extracted_profile
                              ?.email
                          }
                        />

                        <InfoRow
                          label="Phone"
                          value={
                            result
                              .extracted_profile
                              ?.phone
                          }
                        />

                        <InfoRow
                          label="Position"
                          value={
                            result
                              .extracted_profile
                              ?.current_position
                          }
                        />
                      </dl>
                    </section>

                    <section className="rounded-lg border border-black/[0.06] p-4">
                      <SectionTitle>
                        Analysis details
                      </SectionTitle>

                      <dl className="space-y-2 text-sm">
                        <InfoRow
                          label="Model"
                          value={
                            result.model_name
                          }
                        />

                        <InfoRow
                          label="Processed"
                          value={
                            result.processed_at
                              ? formatDateTime(
                                result.processed_at,
                              )
                              : null
                          }
                        />
                      </dl>
                    </section>
                  </div>

                  <section>
                    <SectionTitle>
                      Skills
                    </SectionTitle>

                    {(result.skills ??
                      []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          result.skills ??
                          []
                        ).map(
                          (
                            skill,
                            index,
                          ) => (
                            <Badge
                              key={`${skill.name}-${index}`}
                              variant="secondary"
                            >
                              {
                                skill.name
                              }
                            </Badge>
                          ),
                        )}
                      </div>
                    ) : (
                      <EmptyText>
                        No skills were extracted.
                      </EmptyText>
                    )}
                  </section>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <AnalysisList
                      title="Work experience"
                      emptyText="No work experience was extracted."
                      items={(
                        result.work_experiences ??
                        []
                      ).map(
                        (
                          experience,
                        ) =>
                          [
                            experience.position,
                            experience.company,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(" · "),
                      )}
                    />

                    <AnalysisList
                      title="Education"
                      emptyText="No education was extracted."
                      items={(
                        result.education ??
                        []
                      ).map(
                        (
                          education,
                        ) =>
                          [
                            education.degree,
                            education.institution,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(" · "),
                      )}
                    />

                    <AnalysisList
                      title="Languages"
                      emptyText="No languages were extracted."
                      items={(
                        result.languages ??
                        []
                      ).map(
                        (
                          language,
                        ) =>
                          [
                            language.name,
                            language.proficiency,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(" · "),
                      )}
                    />

                    <AnalysisList
                      title="Certificates"
                      emptyText="No certificates were extracted."
                      items={(
                        result.certificates ??
                        []
                      ).map(
                        (
                          certificate,
                        ) =>
                          certificate.name,
                      )}
                    />
                  </div>

                  {result.raw_text && (
                    <section>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
                        onClick={() => {
                          setShowRawText(
                            (
                              current,
                            ) =>
                              !current,
                          );
                        }}
                      >
                        {showRawText ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}

                        {showRawText
                          ? "Hide extracted text"
                          : "View extracted text"}
                      </button>

                      {showRawText && (
                        <pre className="mt-2 max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/[0.03] p-4 font-sans text-xs leading-5 text-[var(--color-ink)]/70">
                          {
                            result.raw_text
                          }
                        </pre>
                      )}
                    </section>
                  )}

                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />

                    AI-generated information
                    should be reviewed by HR
                    before making recruitment
                    decisions.
                  </div>
                </>
              )}

            {!isLoading &&
              !isError &&
              !result && (
                <EmptyState
                  icon={Sparkles}
                  title="No AI analysis yet"
                  description="Start AI parsing to extract structured data from this resume."
                  action={
                    <Button
                      type="button"
                      size="sm"
                      onClick={
                        handleParseResume
                      }
                      disabled={
                        parseResume.isPending
                      }
                    >
                      {parseResume.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}

                      Start AI parsing
                    </Button>
                  }
                />
              )}

            {isParsing &&
              !result && (
                <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting AI resume analysis...
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* {result?.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-[var(--color-accent)]" />
              AI Job Match
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {applications.length === 0 ? (
              <EmptyState
                icon={BriefcaseBusiness}
                title="No application found"
                description="This resume is not linked to an application yet. Create an application before running AI job matching."
              />

            ) : (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">
                    Select application
                  </p>

                  <Select
                    value={selectedApplicationId}
                    onValueChange={
                      setSelectedApplicationId
                    }
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Select a job application" />
                    </SelectTrigger>

                    <SelectContent>
                      {applications.map(
                        (application) => (
                          <SelectItem
                            key={application.id}
                            value={application.id}
                          >
                            {application.job.title}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() =>
                      runJobMatch.mutate(undefined, {
                        onSuccess: () => {
                          toast.success(
                            "AI Job Match completed",
                          );
                        },

                        onError: (error) => {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "AI Job Match failed",
                          );
                        },
                      })
                    }
                    disabled={
                      !selectedApplicationId ||
                      runJobMatch.isPending
                    }
                  >
                    {runJobMatch.isPending
                      ? "Analyzing..."
                      : "Run AI Job Match"}
                  </Button>
                </div>

                {selectedApplication && (
                  <AIJobMatchPanel
                    applicationId={
                      selectedApplication.id
                    }
                    showRunButton={false}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )} */}
    </div>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">
      {children}
    </p>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value:
  | string
  | null
  | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/[0.05] pb-2 last:border-none last:pb-0">
      <dt className="text-[var(--color-ink)]/50">
        {label}
      </dt>

      <dd className="max-w-[70%] break-words text-right text-[var(--color-ink)]">
        {value || "-"}
      </dd>
    </div>
  );
}

function AnalysisList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  const normalizedItems =
    items.filter(Boolean);

  return (
    <section className="rounded-lg border border-black/[0.06] p-4">
      <SectionTitle>
        {title}
      </SectionTitle>

      {normalizedItems.length >
        0 ? (
        <ul className="space-y-2 text-sm text-[var(--color-ink)]/80">
          {normalizedItems.map(
            (
              item,
              index,
            ) => (
              <li
                key={`${item}-${index}`}
                className="flex items-start gap-2"
              >
                <span className="text-[var(--color-ink)]/35">
                  •
                </span>

                <span>{item}</span>
              </li>
            ),
          )}
        </ul>
      ) : (
        <EmptyText>
          {emptyText}
        </EmptyText>
      )}
    </section>
  );
}

function EmptyText({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-sm text-[var(--color-ink)]/45">
      {children}
    </p>
  );
}