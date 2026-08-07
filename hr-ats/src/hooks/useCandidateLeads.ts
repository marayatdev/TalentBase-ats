import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  candidateLeadsApi,
  type CandidateLeadListParams,
  type ConvertCandidateLeadPayload,
  type UpdateCandidateLeadPayload,
} from "@/api/candidate-leads.api";

export const candidateLeadQueryKeys = {
  all: ["candidate-leads"] as const,

  lists: () => [...candidateLeadQueryKeys.all, "list"] as const,

  list: (params: CandidateLeadListParams) =>
    [...candidateLeadQueryKeys.lists(), params] as const,

  details: () => [...candidateLeadQueryKeys.all, "detail"] as const,

  detail: (id: string) => [...candidateLeadQueryKeys.details(), id] as const,
};

export function useCandidateLeads(params: CandidateLeadListParams = {}) {
  return useQuery({
    queryKey: candidateLeadQueryKeys.list(params),

    queryFn: () => candidateLeadsApi.list(params),

    placeholderData: (previousData) => previousData,
  });
}

export function useCandidateLead(id?: string) {
  return useQuery({
    queryKey: candidateLeadQueryKeys.detail(id ?? ""),

    queryFn: () => candidateLeadsApi.get(id!),

    enabled: Boolean(id),
  });
}

export function useUpdateCandidateLead(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCandidateLeadPayload) =>
      candidateLeadsApi.update(id, payload),

    onSuccess: (updatedLead) => {
      queryClient.setQueryData(candidateLeadQueryKeys.detail(id), updatedLead);

      void queryClient.invalidateQueries({
        queryKey: candidateLeadQueryKeys.lists(),
      });
    },
  });
}

export function useConvertCandidateLead(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConvertCandidateLeadPayload) =>
      candidateLeadsApi.convert(id, payload),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: candidateLeadQueryKeys.all,
      });

      void queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["applications"],
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
