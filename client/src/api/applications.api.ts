import { api } from "./axios";
import type { ApiSuccess, ListParams } from "@/types/api";
import type {
  Application,
  ApplicationStatus,
  CandidateSource,
  JobStatus,
  ParseStatus,
  StageType,
} from "@/types/domain";

export interface ApplicationsListParams extends ListParams {
  job_id?: string;
  candidate_id?: string;
  stage_id?: string;
  status?: ApplicationStatus;
  assigned_hr_id?: string;
}

export interface CreateApplicationPayload {
  candidate_id: string;
  job_id: string;
  resume_id?: string | null;
  assigned_hr_id?: string | null;
}

export interface MoveApplicationStagePayload {
  stage_id: string;
  note?: string;
}

export interface UpdateApplicationStatusPayload {
  status: ApplicationStatus;
  note?: string;
}

export interface ApplicationsListResult {
  items: Application[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

interface BackendCandidate {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  current_position?: string | null;
  source?: CandidateSource;
}

interface BackendJob {
  id: string;
  title: string;
  status: JobStatus;
}

interface BackendResume {
  id: string;
  original_file_name: string;
  file_url: string;
  parse_status: ParseStatus;
}

interface BackendPipelineStage {
  id: string;
  name: string;
  stage_order: number;
  stage_type: StageType;
}

interface BackendAssignedHr {
  id: string;
  name: string;
  email: string;
}

interface BackendApplication {
  id: string;

  candidate_id: string;
  job_id: string;
  resume_id: string | null;
  current_stage_id: string | null;
  assigned_hr_id: string | null;

  ai_match_score: string | number | null;
  ai_match_summary: string | null;

  status: ApplicationStatus;

  applied_at: string;
  updated_at: string;

  candidates: BackendCandidate;
  jobs: BackendJob;
  resumes: BackendResume | null;
  pipeline_stages: BackendPipelineStage | null;
  users: BackendAssignedHr | null;
}

interface BackendApplicationsListResponse {
  applications: BackendApplication[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function mapBackendApplication(value: BackendApplication): Application {
  return {
    id: String(value.id),

    candidate: {
      id: String(value.candidates.id),

      full_name: value.candidates.full_name,

      email: value.candidates.email,

      phone: value.candidates.phone ?? null,

      current_position: value.candidates.current_position ?? null,

      source: value.candidates.source ?? "manual",
    },

    job: {
      id: String(value.jobs.id),
      title: value.jobs.title,
      status: value.jobs.status,
    },

    resume: value.resumes
      ? {
          id: String(value.resumes.id),

          original_file_name: value.resumes.original_file_name,

          file_url: value.resumes.file_url,

          parse_status: value.resumes.parse_status,
        }
      : null,

    resume_id: value.resume_id === null ? null : String(value.resume_id),

    current_stage: value.pipeline_stages
      ? {
          id: String(value.pipeline_stages.id),

          name: value.pipeline_stages.name,

          stage_order: value.pipeline_stages.stage_order,

          stage_type: value.pipeline_stages.stage_type,
        }
      : null,

    assigned_hr: value.users
      ? {
          id: String(value.users.id),

          name: value.users.name,

          email: value.users.email,
        }
      : null,

    status: value.status,

    ai_match_score:
      value.ai_match_score === null ? null : Number(value.ai_match_score),

    ai_match_summary: value.ai_match_summary ?? null,

    resume_parse_status: value.resumes?.parse_status ?? null,

    applied_at: value.applied_at,

    updated_at: value.updated_at,
  };
}

export const applicationsApi = {
  list: async (
    params: ApplicationsListParams = {},
  ): Promise<ApplicationsListResult> => {
    const page = Math.max(Number(params.page) || 1, 1);

    const pageSize = Math.min(Math.max(Number(params.page_size) || 10, 1), 100);

    const requestParams = {
      page,
      limit: pageSize,

      search: params.search?.trim() || undefined,

      job_id: params.job_id,

      candidate_id: params.candidate_id,

      stage_id: params.stage_id,

      status: params.status,

      assigned_hr_id: params.assigned_hr_id,
    };

    const { data } = await api.get<ApiSuccess<BackendApplicationsListResponse>>(
      "/applications",
      {
        params: requestParams,
      },
    );

    return {
      items: data.data.applications.map(mapBackendApplication),

      page: data.data.pagination.page,

      page_size: data.data.pagination.limit,

      total: data.data.pagination.total,

      total_pages: data.data.pagination.totalPages,
    };
  },

  kanban: async (jobId: string): Promise<Application[]> => {
    const { data } = await api.get<ApiSuccess<BackendApplicationsListResponse>>(
      "/applications",
      {
        params: {
          job_id: jobId,
          page: 1,
          limit: 100,
        },
      },
    );

    return data.data.applications.map(mapBackendApplication);
  },

  get: async (id: string): Promise<Application> => {
    const { data } = await api.get<ApiSuccess<BackendApplication>>(
      `/applications/${id}`,
    );

    return mapBackendApplication(data.data);
  },

  create: async (payload: CreateApplicationPayload): Promise<Application> => {
    const { data } = await api.post<ApiSuccess<BackendApplication>>(
      "/applications",
      payload,
    );

    return mapBackendApplication(data.data);
  },

  moveStage: async (
    id: string,
    payload: MoveApplicationStagePayload,
  ): Promise<Application> => {
    const { data } = await api.patch<ApiSuccess<BackendApplication>>(
      `/applications/${id}/move-stage`,
      payload,
    );

    return mapBackendApplication(data.data);
  },

  updateStatus: async (
    id: string,
    payload: UpdateApplicationStatusPayload,
  ): Promise<Application> => {
    const { data } = await api.patch<ApiSuccess<BackendApplication>>(
      `/applications/${id}/status`,
      payload,
    );

    return mapBackendApplication(data.data);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/applications/${id}`);
  },
};
