import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applicationsApi,
  type ApplicationsListParams,
  type CreateApplicationPayload,
  type MoveApplicationStagePayload,
  type UpdateApplicationStatusPayload,
} from "@/api/applications.api";
import type { Application } from "@/types/domain";

export const applicationQueryKeys = {
  all: ["applications"] as const,

  lists: () => [...applicationQueryKeys.all, "list"] as const,

  list: (params: ApplicationsListParams) =>
    [...applicationQueryKeys.lists(), params] as const,

  details: () => [...applicationQueryKeys.all, "detail"] as const,

  detail: (id: string) => [...applicationQueryKeys.details(), id] as const,

  kanbans: () => [...applicationQueryKeys.all, "kanban"] as const,

  kanban: (jobId: string) =>
    [...applicationQueryKeys.kanbans(), jobId] as const,
};

export function useApplications(params: ApplicationsListParams = {}) {
  return useQuery({
    queryKey: applicationQueryKeys.list(params),

    queryFn: () => applicationsApi.list(params),

    placeholderData: (previousData) => previousData,
  });
}

export function useKanbanApplications(jobId?: string) {
  return useQuery<Application[], Error>({
    queryKey: applicationQueryKeys.kanban(jobId ?? ""),

    queryFn: () => applicationsApi.kanban(jobId!),

    enabled: Boolean(jobId),

    /*
     * ป้องกัน Component ได้ undefined
     */
    initialData: jobId ? undefined : [],

    select: (applications) => (Array.isArray(applications) ? applications : []),
  });
}

export function useApplication(id?: string) {
  return useQuery({
    queryKey: applicationQueryKeys.detail(id ?? ""),

    queryFn: () => applicationsApi.get(id!),

    enabled: Boolean(id),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateApplicationPayload) =>
      applicationsApi.create(payload),

    onSuccess: (application) => {
      queryClient.setQueryData(
        applicationQueryKeys.detail(application.id),
        application,
      );

      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.lists(),
      });

      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.kanban(application.job.id),
      });

      void queryClient.invalidateQueries({
        queryKey: ["jobs"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });
    },
  });
}

export function useMoveApplicationStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: MoveApplicationStagePayload;
    }) => applicationsApi.moveStage(id, payload),

    onSuccess: (application) => {
      /*
       * อัปเดตหน้า Detail ทันที
       */
      queryClient.setQueryData(
        applicationQueryKeys.detail(application.id),
        application,
      );

      /*
       * invalidate list ทั้งหมด
       */
      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.lists(),
      });

      /*
       * invalidate Kanban ของ Job นี้
       */
      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.kanban(application.job.id),
      });

      /*
       * จำนวน Application ในแต่ละ Stage อาจเปลี่ยน
       */
      void queryClient.invalidateQueries({
        queryKey: ["pipeline-stages", application.job.id],
      });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateApplicationStatusPayload;
    }) => applicationsApi.updateStatus(id, payload),

    onSuccess: (application) => {
      queryClient.setQueryData(
        applicationQueryKeys.detail(application.id),
        application,
      );

      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.lists(),
      });

      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.kanban(application.job.id),
      });

      void queryClient.invalidateQueries({
        queryKey: ["pipeline-stages", application.job.id],
      });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applicationsApi.remove(id),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.all,
      });

      void queryClient.invalidateQueries({
        queryKey: ["jobs"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["pipeline-stages"],
      });
    },
  });
}
