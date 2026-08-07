import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  candidateImportsApi,
  type ImportHistoryParams,
  type ManualCandidateImportPayload,
  type ParseCandidateTextPayload,
} from "@/api/candidate-imports.api";

export const candidateImportQueryKeys = {
  all: ["candidate-imports"] as const,

  histories: () => [...candidateImportQueryKeys.all, "history"] as const,

  history: (params: ImportHistoryParams) =>
    [...candidateImportQueryKeys.histories(), params] as const,
};

export function useParseCandidateText() {
  return useMutation({
    mutationFn: (payload: ParseCandidateTextPayload) =>
      candidateImportsApi.parseText(payload),
  });
}

export function useImportCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ManualCandidateImportPayload) =>
      candidateImportsApi.importManual(payload),

    onSuccess: (result, payload) => {
      void queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["applications"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["applications", "kanban", payload.job_id],
      });

      void queryClient.invalidateQueries({
        queryKey: ["pipeline-stages", payload.job_id],
      });

      void queryClient.invalidateQueries({
        queryKey: ["jobs"],
      });

      void queryClient.invalidateQueries({
        queryKey: candidateImportQueryKeys.all,
      });

      queryClient.setQueryData(
        ["applications", "detail", result.application_id],
        undefined,
      );
    },
  });
}

export function useImportHistory(params: ImportHistoryParams) {
  return useQuery({
    queryKey: candidateImportQueryKeys.history(params),

    queryFn: () => candidateImportsApi.getHistory(params),

    placeholderData: (previousData) => previousData,
  });
}
