import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
} from "react-router-dom";
import { toast } from "sonner";
import {
  GripVertical,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  CSS,
} from "@dnd-kit/utilities";

import {
  Button,
} from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Input,
} from "@/components/ui/input";
import {
  Label,
} from "@/components/ui/label";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Skeleton,
} from "@/components/ui/skeleton";

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
  useJob,
} from "@/hooks/useJobs";
import {
  useCreateStage,
  useDeleteStage,
  useGenerateDefaultPipeline,
  usePipelineStages,
  useReorderPipelineStages,
  useUpdateStage,
} from "@/hooks/usePipeline";

import type {
  PipelineStage,
  StageType,
} from "@/types/domain";

interface SortableStageRowProps {
  stage: PipelineStage;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableStageRow({
  stage,
  onEdit,
  onDelete,
}: SortableStageRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stage.id,
  });

  const style = {
    transform:
      CSS.Transform.toString(transform),
    transition,
    opacity: isDragging
      ? 0.5
      : 1,
  };

  const typeVariant: Record<
    StageType,
    "secondary" | "success" | "danger"
  > = {
    active: "secondary",
    hired: "success",
    rejected: "danger",
  };

  const applicationCount =
    stage.application_count ??
    stage.candidate_count ??
    0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-black/[0.06] bg-white p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-[var(--color-ink)]/30 hover:text-[var(--color-ink)]/60 active:cursor-grabbing"
        aria-label={`Reorder ${stage.name}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-[var(--color-ink)]">
            {stage.name}
          </p>

          <span className="text-xs text-[var(--color-ink)]/35">
            #{stage.stage_order}
          </span>
        </div>

        <p className="text-xs text-[var(--color-ink)]/50">
          {applicationCount}{" "}
          {applicationCount === 1
            ? "application"
            : "applications"}
        </p>
      </div>

      <Badge
        variant={
          typeVariant[
          stage.stage_type
          ]
        }
      >
        {stage.stage_type}
      </Badge>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onEdit}
        aria-label={`Edit ${stage.name}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        aria-label={`Delete ${stage.name}`}
      >
        <Trash2 className="h-4 w-4 text-red-600" />
      </Button>
    </div>
  );
}

export default function JobPipelinePage() {
  const {
    id,
  } = useParams<{
    id: string;
  }>();

  const jobId = id ?? "";

  const {
    data: job,
    isLoading: isJobLoading,
  } = useJob(jobId);

  const {
    data: stagesData,
    isLoading: isStagesLoading,
  } = usePipelineStages(jobId);

  const createStage =
    useCreateStage(jobId);

  const updateStage =
    useUpdateStage(jobId);

  const deleteStage =
    useDeleteStage(jobId);

  const generateDefault =
    useGenerateDefaultPipeline(
      jobId,
    );

  const reorderStages =
    useReorderPipelineStages(
      jobId,
    );

  const [
    orderedStages,
    setOrderedStages,
  ] = useState<
    PipelineStage[] | null
  >(null);

  const [
    dialogOpen,
    setDialogOpen,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState<
      PipelineStage | null
    >(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<
      PipelineStage | null
    >(null);

  const [
    name,
    setName,
  ] = useState("");

  const [
    stageType,
    setStageType,
  ] =
    useState<StageType>(
      "active",
    );

  const stages =
    stagesData ?? [];

  const list =
    orderedStages ?? stages;

  useEffect(() => {
    /*
     * เมื่อ API โหลดข้อมูลชุดใหม่สำเร็จ
     * ให้กลับไปใช้ข้อมูลจาก React Query
     */
    setOrderedStages(null);
  }, [stagesData]);

  const sensors = useSensors(
    useSensor(
      PointerSensor,
      {
        activationConstraint: {
          distance: 5,
        },
      },
    ),
  );

  function handleDragEnd(
    event: DragEndEvent,
  ): void {
    const {
      active,
      over,
    } = event;

    if (
      !over ||
      active.id === over.id
    ) {
      return;
    }

    const oldIndex =
      list.findIndex(
        (stage) =>
          stage.id ===
          String(active.id),
      );

    const newIndex =
      list.findIndex(
        (stage) =>
          stage.id ===
          String(over.id),
      );

    if (
      oldIndex < 0 ||
      newIndex < 0
    ) {
      return;
    }

    const previousStages =
      list;

    const reordered =
      arrayMove(
        list,
        oldIndex,
        newIndex,
      ).map(
        (
          stage,
          index,
        ) => ({
          ...stage,
          stage_order:
            index + 1,
        }),
      );

    /*
     * Optimistic UI
     */
    setOrderedStages(
      reordered,
    );

    reorderStages.mutate(
      {
        stages:
          reordered.map(
            (stage) => ({
              id:
                stage.id,

              stage_order:
                stage.stage_order,
            }),
          ),
      },
      {
        onSuccess: () => {
          toast.success(
            "Pipeline order updated",
          );

          setOrderedStages(
            null,
          );
        },

        onError: (
          error,
        ) => {
          setOrderedStages(
            previousStages,
          );

          toast.error(
            error instanceof Error
              ? error.message
              : "Could not update pipeline order",
          );
        },
      },
    );
  }

  function openCreate(): void {
    setEditing(null);
    setName("");
    setStageType(
      "active",
    );
    setDialogOpen(
      true,
    );
  }

  function openEdit(
    stage: PipelineStage,
  ): void {
    setEditing(stage);
    setName(stage.name);
    setStageType(
      stage.stage_type,
    );
    setDialogOpen(
      true,
    );
  }

  function closeDialog(): void {
    if (
      createStage.isPending ||
      updateStage.isPending
    ) {
      return;
    }

    setDialogOpen(false);
    setEditing(null);
    setName("");
    setStageType(
      "active",
    );
  }

  function submitDialog(): void {
    const normalizedName =
      name.trim();

    if (!normalizedName) {
      toast.error(
        "Please enter a stage name",
      );

      return;
    }

    if (editing) {
      updateStage.mutate(
        {
          id: editing.id,

          payload: {
            name:
              normalizedName,

            stage_type:
              stageType,
          },
        },
        {
          onSuccess: () => {
            toast.success(
              "Stage updated",
            );

            closeDialog();
          },

          onError: (
            error,
          ) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Could not update stage",
            );
          },
        },
      );

      return;
    }

    createStage.mutate(
      {
        job_id:
          jobId,

        name:
          normalizedName,

        /*
         * Backend ใช้ stage_order
         * ไม่ใช่ order
         */
        stage_order:
          list.length + 1,

        stage_type:
          stageType,
      },
      {
        onSuccess: () => {
          toast.success(
            "Stage created",
          );

          closeDialog();
        },

        onError: (
          error,
        ) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not create stage",
          );
        },
      },
    );
  }

  function handleGenerateDefault(): void {
    generateDefault.mutate(
      undefined,
      {
        onSuccess: () => {
          toast.success(
            "Default pipeline generated",
          );
        },

        onError: (
          error,
        ) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not generate default pipeline",
          );
        },
      },
    );
  }

  const isLoading =
    isJobLoading ||
    isStagesLoading;

  const isMutating =
    createStage.isPending ||
    updateStage.isPending ||
    reorderStages.isPending;

  if (!jobId) {
    return (
      <Card>
        <CardContent className="p-4">
          <EmptyState
            icon={Layers}
            title="Invalid job"
            description="The job ID is missing from the URL."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Pipeline · ${job?.title ?? ""
          }`}
        description="Configure the recruitment stages candidates move through for this job."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={
                handleGenerateDefault
              }
              disabled={
                generateDefault.isPending ||
                list.length > 0
              }
            >
              <Wand2 className="h-4 w-4" />

              {generateDefault.isPending
                ? "Generating..."
                : "Generate default pipeline"}
            </Button>

            <Button
              type="button"
              onClick={
                openCreate
              }
              disabled={
                isMutating
              }
            >
              <Plus className="h-4 w-4" />
              Add stage
            </Button>
          </>
        }
      />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({
            length: 5,
          }).map(
            (
              _,
              index,
            ) => (
              <Skeleton
                key={
                  index
                }
                className="h-16 rounded-lg"
              />
            ),
          )}
        </div>
      )}

      {!isLoading &&
        list.length === 0 && (
          <Card>
            <CardContent className="p-4">
              <EmptyState
                icon={Layers}
                title="No pipeline stages yet"
                description="Generate the default recruitment pipeline or add stages manually."
                action={
                  <Button
                    type="button"
                    size="sm"
                    onClick={
                      handleGenerateDefault
                    }
                    disabled={
                      generateDefault.isPending
                    }
                  >
                    <Wand2 className="h-4 w-4" />

                    Generate default pipeline
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )}

      {!isLoading &&
        list.length > 0 && (
          <DndContext
            sensors={
              sensors
            }
            collisionDetection={
              closestCenter
            }
            onDragEnd={
              handleDragEnd
            }
          >
            <SortableContext
              items={list.map(
                (stage) =>
                  stage.id,
              )}
              strategy={
                verticalListSortingStrategy
              }
            >
              <div className="space-y-2">
                {list.map(
                  (stage) => (
                    <SortableStageRow
                      key={
                        stage.id
                      }
                      stage={
                        stage
                      }
                      onEdit={() =>
                        openEdit(
                          stage,
                        )
                      }
                      onDelete={() =>
                        setDeleteTarget(
                          stage,
                        )
                      }
                    />
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(
          open,
        ) => {
          if (!open) {
            closeDialog();

            return;
          }

          setDialogOpen(
            true,
          );
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Edit stage"
                : "Create stage"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="stage-name">
                Stage name
              </Label>

              <Input
                id="stage-name"
                value={name}
                onChange={(
                  event,
                ) =>
                  setName(
                    event.target.value,
                  )
                }
                placeholder="Technical Interview"
                autoFocus
                maxLength={100}
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();
                    submitDialog();
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Stage type
              </Label>

              <Select
                value={
                  stageType
                }
                onValueChange={(
                  value,
                ) =>
                  setStageType(
                    value as StageType,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="active">
                    Active
                  </SelectItem>

                  <SelectItem value="hired">
                    Hired
                  </SelectItem>

                  <SelectItem value="rejected">
                    Rejected
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={
                closeDialog
              }
              disabled={
                createStage.isPending ||
                updateStage.isPending
              }
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={
                submitDialog
              }
              disabled={
                !name.trim() ||
                createStage.isPending ||
                updateStage.isPending
              }
            >
              {editing
                ? updateStage.isPending
                  ? "Saving..."
                  : "Save changes"
                : createStage.isPending
                  ? "Creating..."
                  : "Create stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={
          deleteTarget !==
          null
        }
        onOpenChange={(
          open,
        ) => {
          if (!open) {
            setDeleteTarget(
              null,
            );
          }
        }}
        title={`Delete "${deleteTarget?.name ??
          ""
          }"?`}
        description={
          (deleteTarget
            ?.application_count ??
            deleteTarget
              ?.candidate_count ??
            0) > 0
            ? "This stage contains applications. Move them to another stage before deleting it."
            : "This stage will be permanently removed from the job pipeline."
        }
        destructive
        confirmLabel="Delete stage"
        isLoading={
          deleteStage.isPending
        }
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }

          deleteStage.mutate(
            deleteTarget.id,
            {
              onSuccess: () => {
                toast.success(
                  "Stage deleted",
                );

                setDeleteTarget(
                  null,
                );
              },

              onError: (
                error,
              ) => {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not delete stage",
                );
              },
            },
          );
        }}
      />
    </div>
  );
}