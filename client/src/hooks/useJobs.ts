import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi, type JobPayload } from "@/api/jobs.api";
import type { ListParams } from "@/types/api";

export function useJobs(params: ListParams & { status?: string; employment_type?: string } = {}) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: () => jobsApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => jobsApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: JobPayload) => jobsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useUpdateJob(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<JobPayload>) => jobsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs", id] });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}
