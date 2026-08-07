import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Calendar,
  Kanban,
  Sparkles,
} from "lucide-react";
import {
  useQueryClient,
} from "@tanstack/react-query";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageHeader,
} from "@/components/shared/PageHeader";
import {
  EmptyState,
} from "@/components/shared/EmptyState";
import {
  ConfirmDialog,
} from "@/components/shared/ConfirmDialog";
import {
  ParseStatusBadge,
} from "@/components/shared/StatusBadges";
import {
  SourceIcon,
} from "@/components/shared/SourceIcon";

import { useJobs } from "@/hooks/useJobs";
import {
  usePipelineStages,
} from "@/hooks/usePipeline";
import {
  useKanbanApplications,
  useMoveApplicationStage,
} from "@/hooks/useApplications";
import {
  formatDate,
} from "@/lib/utils";
import type {
  Application,
  PipelineStage,
} from "@/types/domain";

interface ApplicationCardContentProps {
  app: Application;
}

function ApplicationCardContent({
  app,
}: ApplicationCardContentProps) {
  return (
    <>
      <p className="text-sm font-medium text-[var(--color-ink)]">
        {app.candidate.full_name}
      </p>

      <p className="text-xs text-[var(--color-ink)]/55">
        {app.candidate.current_position ??
          "-"}
      </p>

      <p className="mt-1 text-xs text-[var(--color-ink)]/45">
        {app.job.title}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {app.ai_match_score !== null && (
          <Badge
            variant="outline"
            className="gap-1"
          >
            <Sparkles className="h-3 w-3" />
            {app.ai_match_score.toFixed(2)}
          </Badge>
        )}

        <span className="flex items-center gap-1">
          <SourceIcon
            source={app.candidate.source}
            className="h-3.5 w-3.5"
          />
        </span>

        <ParseStatusBadge
          status={
            app.resume_parse_status
          }
        />
      </div>

      <p className="mt-2 flex items-center gap-1 text-[11px] text-[var(--color-ink)]/40">
        <Calendar className="h-3 w-3" />

        {formatDate(app.applied_at)}
      </p>
    </>
  );
}

function ApplicationCard({
  app,
}: {
  app: Application;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: app.id,
  });

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        "cursor-grab rounded-lg border border-black/[0.06] bg-white p-3 shadow-sm",
        "active:cursor-grabbing",
        isDragging
          ? "opacity-40"
          : "",
      ].join(" ")}
    >
      <ApplicationCardContent
        app={app}
      />
    </div>
  );
}

function ApplicationDragOverlay({
  app,
}: {
  app: Application;
}) {
  return (
    <div className="w-72 rotate-1 rounded-lg border border-black/[0.08] bg-white p-3 shadow-lg">
      <ApplicationCardContent
        app={app}
      />
    </div>
  );
}

interface StageColumnProps {
  stage: PipelineStage;
  count: number;
  children: React.ReactNode;
}

function StageColumn({
  stage,
  count,
  children,
}: StageColumnProps) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: stage.id,
  });

  const headerTone =
    stage.stage_type === "hired"
      ? "text-emerald-700"
      : stage.stage_type ===
        "rejected"
        ? "text-red-600"
        : "text-[var(--color-ink)]";

  return (
    <div
      ref={setNodeRef}
      className={[
        "flex w-72 shrink-0 flex-col rounded-xl",
        "border border-black/[0.06] bg-black/[0.015]",
        "transition-colors",
        isOver
          ? "ring-2 ring-[var(--color-primary)]/40"
          : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <p
          className={`text-sm font-semibold ${headerTone}`}
        >
          {stage.name}
        </p>

        <Badge variant="muted">
          {count}
        </Badge>
      </div>

      <div
        className="flex-1 space-y-2 overflow-y-auto px-3 pb-3 scrollbar-thin"
        style={{
          maxHeight:
            "calc(100vh - 260px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface PendingMove {
  app: Application;
  stage: PipelineStage;
}

export default function PipelineBoardPage() {
  const [
    params,
    setParams,
  ] = useSearchParams();

  const queryClient =
    useQueryClient();

  const jobId =
    params.get("job_id") ??
    undefined;

  const {
    data: jobsData,
    isLoading: isJobsLoading,
  } = useJobs({
    page_size: 100,
    status: "open",
  });

  const jobs =
    jobsData?.jobs ?? [];

  useEffect(() => {
    if (
      !jobId &&
      jobs.length > 0
    ) {
      const next =
        new URLSearchParams(params);

      next.set(
        "job_id",
        jobs[0].id,
      );

      setParams(next, {
        replace: true,
      });
    }
  }, [
    jobId,
    jobs,
    params,
    setParams,
  ]);

  const {
    data: stagesData,
    isLoading: isStagesLoading,
  } = usePipelineStages(jobId);

  const stages =
    stagesData ?? [];

  const {
    data: applicationsData,
    isLoading:
    isApplicationsLoading,
  } =
    useKanbanApplications(jobId);

  const moveStage =
    useMoveApplicationStage();

  const [
    localApps,
    setLocalApps,
  ] =
    useState<
      Application[] | null
    >(null);

  useEffect(() => {
    setLocalApps(null);
  }, [applicationsData]);

  const applications =
    localApps ??
    applicationsData ??
    [];

  const [
    activeId,
    setActiveId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    pendingMove,
    setPendingMove,
  ] =
    useState<
      PendingMove | null
    >(null);

  const sensors =
    useSensors(
      useSensor(
        PointerSensor,
        {
          activationConstraint: {
            distance: 6,
          },
        },
      ),
    );

  const grouped =
    useMemo(() => {
      const map: Record<
        string,
        Application[]
      > = {};

      for (const stage of stages) {
        map[stage.id] = [];
      }

      for (
        const application of
        applications
      ) {
        const stageId =
          application
            .current_stage?.id;

        if (!stageId) {
          continue;
        }

        if (!map[stageId]) {
          map[stageId] = [];
        }

        map[stageId].push(
          application,
        );
      }

      return map;
    }, [
      stages,
      applications,
    ]);

  function performMove(
    application: Application,
    targetStage: PipelineStage,
  ): void {
    const previous =
      applications;

    setLocalApps(
      applications.map(
        (item) =>
          item.id ===
            application.id
            ? {
              ...item,

              current_stage: {
                id:
                  targetStage.id,

                name:
                  targetStage.name,

                stage_type:
                  targetStage.stage_type,

                stage_order:
                  targetStage.stage_order,
              },
            }
            : item,
      ),
    );

    moveStage.mutate(
      {
        id: application.id,

        payload: {
          stage_id:
            targetStage.id,

          note:
            "Moved by HR from pipeline board",
        },
      },
      {
        onSuccess: async () => {
          toast.success(
            `Moved ${application.candidate.full_name} to ${targetStage.name}`,
          );

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "applications",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "pipeline-stages",
                jobId,
              ],
            }),
          ]);

          setLocalApps(null);
        },

        onError: (
          error,
        ) => {
          setLocalApps(previous);

          toast.error(
            error instanceof Error
              ? error.message
              : "Could not move application. Reverted.",
          );
        },
      },
    );
  }

  function handleDragStart(
    event: DragStartEvent,
  ): void {
    setActiveId(
      String(event.active.id),
    );
  }

  function handleDragEnd(
    event: DragEndEvent,
  ): void {
    setActiveId(null);

    const {
      active,
      over,
    } = event;

    if (!over) {
      return;
    }

    const application =
      applications.find(
        (item) =>
          item.id ===
          String(active.id),
      );

    const targetStage =
      stages.find(
        (stage) =>
          stage.id ===
          String(over.id),
      );

    if (
      !application ||
      !targetStage
    ) {
      return;
    }

    if (
      targetStage.id ===
      application
        .current_stage?.id
    ) {
      return;
    }

    if (
      targetStage.stage_type ===
      "hired" ||
      targetStage.stage_type ===
      "rejected"
    ) {
      setPendingMove({
        app: application,
        stage: targetStage,
      });

      return;
    }

    performMove(
      application,
      targetStage,
    );
  }

  const activeApplication =
    applications.find(
      (application) =>
        application.id ===
        activeId,
    );

  const isLoading =
    isJobsLoading ||
    isStagesLoading ||
    isApplicationsLoading;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recruitment pipeline"
        description="Drag candidates between stages to update their progress."
        actions={
          <Select
            value={jobId ?? ""}
            onValueChange={(
              value,
            ) => {
              setLocalApps(null);

              setParams({
                job_id:
                  value,
              });
            }}
            disabled={
              isJobsLoading ||
              jobs.length === 0
            }
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>

            <SelectContent>
              {jobs.map(
                (job) => (
                  <SelectItem
                    key={
                      job.id
                    }
                    value={
                      job.id
                    }
                  >
                    {
                      job.title
                    }
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading recruitment
            pipeline...
          </CardContent>
        </Card>
      ) : !jobId ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={Kanban}
              title="No open jobs"
              description="Create or open a job before viewing the recruitment pipeline."
            />
          </CardContent>
        </Card>
      ) : stages.length ===
        0 ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={Kanban}
              title="No pipeline configured"
              description="Generate a default pipeline from the selected job's Pipeline page."
            />
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={
            closestCorners
          }
          onDragStart={
            handleDragStart
          }
          onDragEnd={
            handleDragEnd
          }
          onDragCancel={() =>
            setActiveId(
              null,
            )
          }
        >
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stages.map(
              (stage) => (
                <StageColumn
                  key={
                    stage.id
                  }
                  stage={
                    stage
                  }
                  count={
                    grouped[
                      stage.id
                    ]?.length ??
                    0
                  }
                >
                  {(
                    grouped[
                    stage.id
                    ] ?? []
                  ).map(
                    (
                      application,
                    ) => (
                      <ApplicationCard
                        key={
                          application.id
                        }
                        app={
                          application
                        }
                      />
                    ),
                  )}
                </StageColumn>
              ),
            )}
          </div>

          <DragOverlay>
            {activeApplication ? (
              <ApplicationDragOverlay
                app={
                  activeApplication
                }
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <ConfirmDialog
        open={
          pendingMove !==
          null
        }
        onOpenChange={(
          open,
        ) => {
          if (!open) {
            setPendingMove(
              null,
            );
          }
        }}
        title={`Move to ${pendingMove?.stage
          .name ?? ""
          }?`}
        description={
          pendingMove
            ? `This will mark ${pendingMove.app.candidate.full_name}'s application as ${pendingMove.stage.name.toLowerCase()}. This action should reflect a confirmed HR decision.`
            : ""
        }
        confirmLabel="Confirm move"
        destructive={
          pendingMove
            ?.stage
            .stage_type ===
          "rejected"
        }
        onConfirm={() => {
          if (pendingMove) {
            performMove(
              pendingMove.app,
              pendingMove.stage,
            );
          }

          setPendingMove(null);
        }}
      />
    </div>
  );
}