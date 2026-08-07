import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  pipelineApi,
  type ReorderPipelinePayload,
  type StagePayload,
} from "@/api/pipeline.api";

export function usePipelineStages(jobId?: string) {
  return useQuery({
    queryKey: ["pipeline-stages", jobId],

    queryFn: () => pipelineApi.listForJob(jobId!),

    enabled: Boolean(jobId),
  });
}

export function useCreateStage(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StagePayload) => pipelineApi.create(payload),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["pipeline-stages", jobId],
      });
    },
  });
}

export function useUpdateStage(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<StagePayload>;
    }) => pipelineApi.update(id, payload),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["pipeline-stages", jobId],
      });
    },
  });
}

export function useDeleteStage(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pipelineApi.remove(id),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["pipeline-stages", jobId],
      });
    },
  });
}

export function useGenerateDefaultPipeline(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => pipelineApi.generateDefault(jobId),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["pipeline-stages", jobId],
      });
    },
  });
}

export function useReorderPipelineStages(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReorderPipelinePayload) =>
      pipelineApi.reorder(jobId, payload),

    onSuccess: (stages) => {
      queryClient.setQueryData(["pipeline-stages", jobId], stages);
    },
  });
}
