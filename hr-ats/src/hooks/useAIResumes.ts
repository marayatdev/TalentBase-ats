import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiResumesApi } from "@/api/ai-resumes.api";

export function useAIResumeResult(
  resumeId?: string,
) {
  return useQuery({
    queryKey: [
      "ai-resume-result",
      resumeId,
    ],

    queryFn: () =>
      aiResumesApi.getByResumeId(
        resumeId as string,
      ),

    enabled: Boolean(resumeId),

    retry: false,
  });
}

export function useParseResume(
  resumeId: string,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: () =>
      aiResumesApi.parse(resumeId),

    onSuccess: (result) => {
      queryClient.setQueryData(
        [
          "ai-resume-result",
          resumeId,
        ],
        result,
      );
    },
  });
}
