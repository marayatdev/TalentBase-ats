import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  candidatesApi,
  CreateCandidateWithResumePayload,
  type CandidatePayload,
} from "@/api/candidates.api";

import type { ListParams } from "@/types/api";
import type { Candidate } from "@/types/domain";

export function useCandidates(
  params: ListParams & {
    source?: string;
  } = {},
) {
  return useQuery({
    queryKey: ["candidates", params],

    queryFn: () => candidatesApi.list(params),

    placeholderData: (previousData) => previousData,
  });
}

export function useCandidate(id?: string) {
  return useQuery<Candidate, Error>({
    queryKey: ["candidates", "detail", id ?? ""],

    queryFn: () => candidatesApi.get(id!),

    enabled: Boolean(id),
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CandidatePayload) => candidatesApi.create(payload),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });
    },
  });
}

export function useUpdateCandidate(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<CandidatePayload>) =>
      candidatesApi.update(id, payload),

    onSuccess: (updatedCandidate) => {
      queryClient.setQueryData(["candidates", "detail", id], updatedCandidate);

      void queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });
    },
  });
}

export function useCreateCandidateWithResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCandidateWithResumePayload) =>
      candidatesApi.createWithResume(payload),

    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["jobs"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["applications"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["pipeline-stages"],
      });

      queryClient.setQueryData(
        ["candidates", "detail", result.candidate.id],
        result.candidate,
      );
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => candidatesApi.remove(id),

    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({
        queryKey: ["candidates", "detail", deletedId],
      });

      void queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });
    },
  });
}
