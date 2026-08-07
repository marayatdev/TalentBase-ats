import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { aiJobMatchesApi } from "@/api/ai-job-matches.api";

export function useAIJobMatch(
  applicationId: string,
) {
  return useQuery({
    queryKey: [
      "ai-job-match",
      applicationId,
    ],

    queryFn: () =>
      aiJobMatchesApi.getByApplication(
        applicationId,
      ),

    enabled: Boolean(applicationId),

    retry: false,
  });
}

export function useRunAIJobMatch(
  applicationId: string,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!applicationId) {
        throw new Error(
          "Please select an application",
        );
      }

      return aiJobMatchesApi.run(
        applicationId,
      );
    },

    onSuccess: (result) => {
      /*
       * ใส่ผลลัพธ์ลง cache ทันที
       * AIJobMatchPanel จะอัปเดตโดยไม่ต้อง reload หน้า
       */
      queryClient.setQueryData(
        [
          "ai-job-match",
          applicationId,
        ],
        result,
      );

      void queryClient.invalidateQueries({
        queryKey: [
          "ai-job-match",
          applicationId,
        ],
      });
    },
  });
}