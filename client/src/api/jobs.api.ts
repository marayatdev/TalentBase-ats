import { api } from "./axios";
import type { ApiSuccess, ListParams } from "@/types/api";
import type { Job } from "@/types/domain";
import { withMockFallback } from "./fallback";
import { mockApi } from "@/mocks/mockApi";

export type JobPayload = Omit<
  Job,
  | "id"
  | "created_by"
  | "created_at"
  | "updated_at"
  | "applicant_count"
  | "created_by_user"
>;

export interface JobsListResponse {
  jobs: Job[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface BackendJob {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;

  employment_type: Job["employment_type"];

  minimum_experience_years: string | number;

  salary_min: string | number | null;

  salary_max: string | number | null;

  number_of_positions: number;
  status: Job["status"];

  created_by: string | null;

  created_at: string;
  updated_at: string;

  users?: {
    id: string;
    name: string;
    email: string;
  } | null;

  _count?: {
    applications: number;
  };
}

interface BackendJobsListResponse {
  jobs: BackendJob[];
  pagination: JobsListResponse["pagination"];
}

interface JobResponse {
  job: BackendJob;
}

function extractBackendJob(value: BackendJob | JobResponse): BackendJob {
  if (value && typeof value === "object" && "job" in value) {
    return value.job;
  }

  return value;
}

function mapBackendJob(job: BackendJob): Job {
  if (!job?.id) {
    throw new Error("Backend response does not contain job data");
  }

  return {
    id: String(job.id),
    title: job.title,
    description: job.description ?? "",
    requirements: job.requirements ?? "",

    employment_type: job.employment_type,

    minimum_experience_years: Number(job.minimum_experience_years),

    salary_min: job.salary_min === null ? null : Number(job.salary_min),

    salary_max: job.salary_max === null ? null : Number(job.salary_max),

    number_of_positions: job.number_of_positions,

    status: job.status,

    created_by: job.created_by === null ? null : String(job.created_by),

    created_by_user: job.users
      ? {
          id: String(job.users.id),
          name: job.users.name,
          email: job.users.email,
        }
      : null,

    applicant_count: job._count?.applications ?? 0,

    created_at: job.created_at,

    updated_at: job.updated_at,
  };
}

export const jobsApi = {
  list: (
    params: ListParams & {
      status?: string;
      employment_type?: string;
    } = {},
  ) =>
    withMockFallback(
      async (): Promise<JobsListResponse> => {
        const requestParams = {
          page: params.page,

          limit: params.page_size,

          search: params.search,

          status: params.status,

          employment_type: params.employment_type,
        };

        const { data } = await api.get<ApiSuccess<BackendJobsListResponse>>(
          "/jobs",
          {
            params: requestParams,
          },
        );

        return {
          jobs: data.data.jobs.map(mapBackendJob),

          pagination: data.data.pagination,
        };
      },

      async (): Promise<JobsListResponse> => {
        const mockResult = await mockApi.jobs.list(
          Number(params.page) || 1,

          Number(params.page_size) || 10,

          params.search ?? "",
          params.status,
          params.employment_type,
        );

        return {
          jobs: mockResult.items,

          pagination: {
            page: mockResult.page,

            limit: mockResult.page_size,

            total: mockResult.total,

            totalPages: Math.ceil(mockResult.total / mockResult.page_size),

            hasNextPage:
              mockResult.page * mockResult.page_size < mockResult.total,

            hasPreviousPage: mockResult.page > 1,
          },
        };
      },
    ),

  get: (id: string) =>
    withMockFallback(
      async (): Promise<Job> => {
        const { data } = await api.get<ApiSuccess<BackendJob | JobResponse>>(
          `/jobs/${id}`,
        );

        return mapBackendJob(extractBackendJob(data.data));
      },

      () => mockApi.jobs.get(id),
    ),

  create: async (payload: JobPayload): Promise<Job> => {
    const { data } = await api.post<ApiSuccess<BackendJob | JobResponse>>(
      "/jobs",
      payload,
    );

    return mapBackendJob(extractBackendJob(data.data));
  },

  update: async (id: string, payload: Partial<JobPayload>): Promise<Job> => {
    const { data } = await api.patch<ApiSuccess<BackendJob | JobResponse>>(
      `/jobs/${id}`,
      payload,
    );

    return mapBackendJob(extractBackendJob(data.data));
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/jobs/${id}`);
  },
};
