import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  useState,
} from "react";

import {
  resumesApi,
} from "@/api/resumes.api";

export function useResumes(
  candidateId:
    | string
    | undefined,
) {
  return useQuery({
    queryKey: [
      "resumes",
      candidateId,
    ],

    queryFn: () =>
      resumesApi.listByCandidate(
        candidateId as string,
      ),

    enabled:
      Boolean(candidateId),
  });
}

export function useUploadResume(
  candidateId: string,
) {
  const qc =
    useQueryClient();

  const [
    progress,
    setProgress,
  ] = useState(0);

  const mutation =
    useMutation({
      mutationFn:
        async (
          file: File,
        ) => {
          setProgress(0);

          const result =
            await resumesApi.upload(
              candidateId,
              file,
            );

          setProgress(100);

          return result;
        },

      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: [
            "resumes",
            candidateId,
          ],
        });

        void qc.invalidateQueries({
          queryKey: [
            "candidates",
            candidateId,
          ],
        });

        setProgress(0);
      },

      onError: () => {
        setProgress(0);
      },
    });

  return {
    ...mutation,
    progress,
  };
}

export function useDeleteResume(
  candidateId: string,
) {
  const qc =
    useQueryClient();

  return useMutation({
    mutationFn:
      (
        id: string,
      ) =>
        resumesApi.remove(
          id,
        ),

    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [
          "resumes",
          candidateId,
        ],
      });

      void qc.invalidateQueries({
        queryKey: [
          "candidates",
          candidateId,
        ],
      });
    },
  });
}