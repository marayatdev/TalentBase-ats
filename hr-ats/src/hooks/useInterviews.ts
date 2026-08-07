import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  interviewsApi,
  type CreateInterviewPayload,
  type UpdateInterviewPayload,
} from "@/api/interviews.api";

export function useApplicationInterviews(applicationId?: string) {
  return useQuery({
    queryKey: ["interviews", "application", applicationId],

    queryFn: () => interviewsApi.listByApplication(applicationId as string),

    enabled: Boolean(applicationId),
  });
}

export function useCreateInterview(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInterviewPayload) =>
      interviewsApi.create(payload),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["interviews", "application", applicationId],
      });
    },
  });
}

export function useCancelInterview(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (interviewId: string) => interviewsApi.cancel(interviewId),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["interviews", "application", applicationId],
      });
    },
  });
}

export function useUpdateInterview(
  applicationId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      interviewId,
      payload,
    }: {
      interviewId: string;
      payload: UpdateInterviewPayload;
    }) =>
      interviewsApi.update(
        interviewId,
        payload,
      ),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          "interviews",
          "application",
          applicationId,
        ],
      });
    },
  });
}
