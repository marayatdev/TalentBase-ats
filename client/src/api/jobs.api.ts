import { api } from "./axios";

import type {
  ApiSuccess,
  ListParams,
} from "@/types/api";

import type {
  Job,
} from "@/types/domain";

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

  description:
  | string
  | null;

  requirements:
  | string
  | null;

  employment_type:
  Job["employment_type"];

  minimum_experience_years:
  | string
  | number;

  salary_min:
  | string
  | number
  | null;

  salary_max:
  | string
  | number
  | null;

  number_of_positions: number;

  status:
  Job["status"];

  created_by:
  | string
  | null;

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

  pagination:
  JobsListResponse["pagination"];
}

interface JobResponse {
  job: BackendJob;
}

function extractBackendJob(
  value:
    | BackendJob
    | JobResponse,
): BackendJob {
  if (
    value &&
    typeof value === "object" &&
    "job" in value
  ) {
    return value.job;
  }

  return value;
}

function mapBackendJob(
  job: BackendJob,
): Job {
  if (!job?.id) {
    throw new Error(
      "Backend response does not contain job data",
    );
  }

  return {
    id:
      String(
        job.id,
      ),

    title:
      job.title,

    description:
      job.description ??
      "",

    requirements:
      job.requirements ??
      "",

    employment_type:
      job.employment_type,

    minimum_experience_years:
      Number(
        job.minimum_experience_years,
      ),

    salary_min:
      job.salary_min ===
        null
        ? null
        : Number(
          job.salary_min,
        ),

    salary_max:
      job.salary_max ===
        null
        ? null
        : Number(
          job.salary_max,
        ),

    number_of_positions:
      job.number_of_positions,

    status:
      job.status,

    created_by:
      job.created_by ===
        null
        ? null
        : String(
          job.created_by,
        ),

    created_by_user:
      job.users
        ? {
          id:
            String(
              job.users.id,
            ),

          name:
            job.users.name,

          email:
            job.users.email,
        }
        : null,

    applicant_count:
      job._count
        ?.applications ??
      0,

    created_at:
      job.created_at,

    updated_at:
      job.updated_at,
  };
}

export const jobsApi = {
  list: async (
    params:
      ListParams & {
        status?: string;
        employment_type?: string;
      } = {},
  ): Promise<JobsListResponse> => {
    const requestParams = {
      page:
        params.page,

      limit:
        params.page_size,

      search:
        params.search,

      status:
        params.status,

      employment_type:
        params.employment_type,
    };

    const {
      data,
    } = await api.get<
      ApiSuccess<BackendJobsListResponse>
    >(
      "/jobs",
      {
        params:
          requestParams,
      },
    );

    return {
      jobs:
        data.data.jobs.map(
          mapBackendJob,
        ),

      pagination:
        data.data.pagination,
    };
  },

  get: async (
    id: string,
  ): Promise<Job> => {
    const {
      data,
    } = await api.get<
      ApiSuccess<
        | BackendJob
        | JobResponse
      >
    >(
      `/jobs/${id}`,
    );

    return mapBackendJob(
      extractBackendJob(
        data.data,
      ),
    );
  },

  create: async (
    payload:
      JobPayload,
  ): Promise<Job> => {
    const {
      data,
    } = await api.post<
      ApiSuccess<
        | BackendJob
        | JobResponse
      >
    >(
      "/jobs",
      payload,
    );

    return mapBackendJob(
      extractBackendJob(
        data.data,
      ),
    );
  },

  update: async (
    id: string,
    payload:
      Partial<JobPayload>,
  ): Promise<Job> => {
    const {
      data,
    } = await api.patch<
      ApiSuccess<
        | BackendJob
        | JobResponse
      >
    >(
      `/jobs/${id}`,
      payload,
    );

    return mapBackendJob(
      extractBackendJob(
        data.data,
      ),
    );
  },

  remove: async (
    id: string,
  ): Promise<void> => {
    await api.delete(
      `/jobs/${id}`,
    );
  },
};