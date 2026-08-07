import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trash2, Sparkles, CalendarPlus,
  ExternalLink,
  Video,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  CalendarClock,
} from "lucide-react";

import { RescheduleInterviewDialog } from "@/components/interviews/RescheduleInterviewDialog";

import type {
  Interview,
} from "@/types/domain";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleConnectDialog } from "@/components/interviews/GoogleConnectDialog";
import { useGoogleConnection } from "@/hooks/useGoogleAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SourceIcon } from "@/components/shared/SourceIcon";
import { AIJobMatchPanel } from "@/components/shared/AIJobMatchPanel";
import {
  ApplicationStatusBadge,
  ParseStatusBadge,
} from "@/components/shared/StatusBadges";

import { useApplication } from "@/hooks/useApplications";
import { applicationsApi } from "@/api/applications.api";
import {
  initials,
  formatDate,
  humanizeEnum,
} from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

import {
  useApplicationInterviews,
} from "@/hooks/useInterviews";

import {
  ScheduleInterviewDialog,
} from "@/components/interviews/ScheduleInterviewDialog";
import { useCancelInterview } from "@/hooks/useInterviews";
import { normalizeError } from "@/api/axios";

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [
    scheduleInterviewOpen,
    setScheduleInterviewOpen,
  ] = useState(false);

  const [
    interviewToReschedule,
    setInterviewToReschedule,
  ] = useState<Interview | null>(null);

  const [
    interviewToCancel,
    setInterviewToCancel,
  ] = useState<string | null>(null);

  const [
    googleConnectOpen,
    setGoogleConnectOpen,
  ] = useState(false);

  const {
    data: googleConnection,
    isLoading: isGoogleConnectionLoading,
    refetch: refetchGoogleConnection,
  } = useGoogleConnection();

  const cancelInterview =
    useCancelInterview(id ?? "");

  const {
    data: interviews = [],
    isLoading: isInterviewsLoading,
  } = useApplicationInterviews(id);

  const {
    data: application,
    isLoading,
    isError,
    refetch,
  } = useApplication(id);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleOpenScheduleInterview(): Promise<void> {
    try {
      const response =
        await refetchGoogleConnection();

      if (response.isError) {
        throw response.error;
      }

      const connection =
        response.data ??
        googleConnection;

      if (!connection?.connected) {
        setGoogleConnectOpen(true);
        return;
      }

      setScheduleInterviewOpen(true);
    } catch (error) {
      toast.error(
        normalizeError(error).message,
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError || !application) {
    return (
      <ErrorState
        onRetry={() => refetch()}
        message="Could not load this application."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${application.candidate.full_name} → ${application.job.title}`}
        description={`Applied ${formatDate(application.applied_at)}`}
        actions={
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Withdraw / delete
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>
              Interviews
            </CardTitle>

            <p className="mt-1 text-xs text-[var(--color-ink)]/50">
              Google Meet interviews scheduled for this application.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => {
              void handleOpenScheduleInterview();
            }}
            disabled={
              isGoogleConnectionLoading
            }
          >
            {isGoogleConnectionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}

            {isGoogleConnectionLoading
              ? "Checking Google..."
              : "Schedule interview"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {isInterviewsLoading && (
            <Skeleton className="h-24 rounded-lg" />
          )}

          {!isInterviewsLoading &&
            interviews.length === 0 && (
              <div className="rounded-lg border border-dashed border-black/10 p-6 text-center">
                <Video className="mx-auto h-7 w-7 text-[var(--color-ink)]/30" />

                <p className="mt-2 text-sm font-medium">
                  No interviews scheduled
                </p>

                <p className="mt-1 text-xs text-[var(--color-ink)]/50">
                  Create a Google Meet invitation for this candidate.
                </p>
              </div>
            )}

          {interviews.map(
            (interview) => (
              <div
                key={interview.id}
                className="rounded-lg border border-black/[0.06] p-4"
              >

                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--color-ink)]">
                        {interview.title}
                      </p>

                      <Badge variant="info">
                        {humanizeEnum(
                          interview.status,
                        )}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-[var(--color-ink)]/65">
                      {new Date(
                        interview.start_at,
                      ).toLocaleString(
                        "th-TH",
                        {
                          dateStyle:
                            "medium",
                          timeStyle:
                            "short",
                          timeZone:
                            interview.timezone,
                        },
                      )}
                      {" – "}
                      {new Date(
                        interview.end_at,
                      ).toLocaleTimeString(
                        "th-TH",
                        {
                          hour:
                            "2-digit",
                          minute:
                            "2-digit",
                          timeZone:
                            interview.timezone,
                        },
                      )}
                    </p>

                    <p className="mt-1 text-xs text-[var(--color-ink)]/45">
                      Interviewers:{" "}
                      {interview.interviewer_emails.join(
                        ", ",
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {interview.meet_url && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          window.open(
                            interview.meet_url!,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        <Video className="h-4 w-4" />
                        Join Meet
                      </Button>
                    )}

                    {interview.status !== "cancelled" &&
                      interview.status !== "completed" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setInterviewToReschedule(
                              interview,
                            )
                          }
                        >
                          <CalendarClock className="h-4 w-4" />
                          Reschedule
                        </Button>
                      )}

                    {interview.status !== "cancelled" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setInterviewToCancel(interview.id)
                        }
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </Button>
                    )}

                    {interview.google_event_url && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(
                            interview.google_event_url!,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open calendar
                      </Button>
                    )}
                  </div>
                </div>

                {interview.description && (
                  <p className="mt-3 border-t border-black/[0.05] pt-3 text-sm text-[var(--color-ink)]/65">
                    {interview.description}
                  </p>
                )}
              </div>
            ),
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Application summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {initials(application.candidate.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <button
                  type="button"
                  className="truncate text-sm font-medium text-[var(--color-ink)] hover:underline"
                  onClick={() =>
                    navigate(
                      `/candidates/${application.candidate.id}`,
                    )
                  }
                >
                  {application.candidate.full_name}
                </button>

                <p className="truncate text-xs text-[var(--color-ink)]/50">
                  {application.candidate.current_position ?? "-"}
                </p>
              </div>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink)]/50">
                  Job
                </dt>
                <dd className="text-right font-medium text-[var(--color-ink)]">
                  {application.job.title}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink)]/50">
                  Stage
                </dt>
                <dd className="text-right text-[var(--color-ink)]">
                  {application.current_stage?.name ?? "Not assigned"}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink)]/50">
                  Status
                </dt>
                <dd>
                  <ApplicationStatusBadge
                    status={application.status}
                  />
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink)]/50">
                  Assigned HR
                </dt>
                <dd className="text-right text-[var(--color-ink)]">
                  {application.assigned_hr?.name ?? "Unassigned"}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink)]/50">
                  Source
                </dt>
                <dd className="flex items-center gap-1.5 text-[var(--color-ink)]">
                  <SourceIcon
                    source={application.candidate.source}
                    className="h-3.5 w-3.5"
                  />
                  {humanizeEnum(application.candidate.source)}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink)]/50">
                  Resume
                </dt>
                <dd>
                  <ParseStatusBadge
                    status={application.resume_parse_status}
                  />
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink)]/50">
                  Applied
                </dt>
                <dd className="text-right text-[var(--color-ink)]">
                  {formatDate(application.applied_at)}
                </dd>
              </div>
            </dl>

            {application.resume_id && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  navigate(
                    `/ai-analysis?resumeId=${application.resume_id}`,
                  )
                }
              >
                <Sparkles className="h-4 w-4" />
                View resume AI analysis
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <AIJobMatchPanel
            applicationId={application.id}
            disabled={
              !application.resume_id ||
              application.resume_parse_status !== "completed"
            }
            disabledReason={
              !application.resume_id
                ? "Upload and attach a resume before running AI match."
                : application.resume_parse_status !== "completed"
                  ? "Complete resume analysis before running AI match."
                  : undefined
            }
          />
        </div>
      </div>


      <RescheduleInterviewDialog
        open={Boolean(
          interviewToReschedule,
        )}
        onOpenChange={(open) => {
          if (!open) {
            setInterviewToReschedule(
              null,
            );
          }
        }}
        applicationId={
          application.id
        }
        interview={
          interviewToReschedule
        }
      />


      <ConfirmDialog
        open={Boolean(interviewToCancel)}
        onOpenChange={(open) => {
          if (!open) {
            setInterviewToCancel(null);
          }
        }}
        title="Cancel this interview?"
        description="The Google Calendar event will be deleted and cancellation notices will be sent to the candidate and interviewers."
        destructive
        confirmLabel="Cancel interview"
        isLoading={cancelInterview.isPending}
        onConfirm={() => {
          if (!interviewToCancel) {
            return;
          }

          cancelInterview.mutate(
            interviewToCancel,
            {
              onSuccess: () => {
                toast.success(
                  "Interview cancelled",
                );

                setInterviewToCancel(null);
              },

              onError: (error) => {
                toast.error(
                  normalizeError(error).message,
                );
              },
            },
          );
        }}
      />

      <ScheduleInterviewDialog
        open={scheduleInterviewOpen}
        onOpenChange={
          setScheduleInterviewOpen
        }
        applicationId={
          application.id
        }
        candidateName={
          application.candidate.full_name
        }
        jobTitle={
          application.job.title
        }
      />

      <GoogleConnectDialog
        open={googleConnectOpen}
        onOpenChange={
          setGoogleConnectOpen
        }
      />
    </div>
  );
}
