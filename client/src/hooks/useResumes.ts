import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resumesApi } from "@/api/resumes.api";
import { useState } from "react";

export function useResumes(candidateId: string | undefined) {
  return useQuery({
    queryKey: ["resumes", candidateId],
    queryFn: () => resumesApi.listForCandidate(candidateId as string),
    enabled: !!candidateId,
  });
}

export function useUploadResume(candidateId: string) {
  const qc = useQueryClient();
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: (file: File) => resumesApi.upload(candidateId, file, setProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumes", candidateId] });
      qc.invalidateQueries({ queryKey: ["candidates", candidateId] });
      setProgress(0);
    },
  });
  return { ...mutation, progress };
}

export function useDeleteResume(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resumesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes", candidateId] }),
  });
}
