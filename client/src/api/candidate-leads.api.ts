import { api } from "./axios";

import type { ApiSuccess } from "@/types/api";

import type {
  ApplicationStatus,
  CandidateLead,
  CandidateLeadSource,
  CandidateLeadStatus,
  JobStatus,
} from "@/types/domain";

export interface CandidateLeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  source?: CandidateLeadSource;
  status?: CandidateLeadStatus;
  target_job_id?: string;
}

export interface CandidateLeadListResponse {
  items: CandidateLead[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateCandidateLeadPayload {
  detected_name?: string | null;
  detected_email?: string | null;
  detected_phone?: string | null;
  detected_position?: string | null;

  skills?: string[];

  target_job_id?: string | null;
  status?: CandidateLeadStatus;
}

export interface ConvertCandidateLeadPayload {
  full_name?: string;

  email?: string | null;
  phone?: string | null;

  linkedin_url?: string | null;
  current_position?: string | null;

  total_experience_years?: number;

  job_id?: string | null;
  create_application?: boolean;
}

export interface ConvertCandidateLeadResult {
  lead_id: string;
  candidate_id: string;
  application_id: string | null;
}

interface BackendCandidateLead {
  id: string;

  source: CandidateLeadSource;
  source_url: string | null;
  raw_text: string;

  detected_name: string | null;
  detected_email: string | null;
  detected_phone: string | null;
  detected_position: string | null;

  skills: unknown;

  ai_confidence: string | number | null;
  ai_reason: string | null;

  target_job_id: string | null;

  status: CandidateLeadStatus;

  reviewed_by: string | null;
  reviewed_at: string | null;

  converted_candidate_id: string | null;
  converted_application_id: string | null;

  created_at: string;
  updated_at: string;

  jobs?: {
    id: string;
    title: string;
    status?: JobStatus;
  } | null;

  reviewers?: {
    id: string;
    name: string;
    email: string;
  } | null;

  converted_candidates?: {
    id: string;
    full_name: string;
  } | null;

  converted_applications?: {
    id: string;
    status: ApplicationStatus;
  } | null;
}

interface BackendCandidateLeadListResponse {
  items: BackendCandidateLead[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function normalizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((skill): skill is string => typeof skill === "string");
}

function mapCandidateLead(lead: BackendCandidateLead): CandidateLead {
  return {
    id: String(lead.id),

    source: lead.source,
    source_url: lead.source_url,
    raw_text: lead.raw_text,

    detected_name: lead.detected_name,
    detected_email: lead.detected_email,
    detected_phone: lead.detected_phone,
    detected_position: lead.detected_position,

    skills: normalizeSkills(lead.skills),

    ai_confidence:
      lead.ai_confidence === null ? null : Number(lead.ai_confidence),

    ai_reason: lead.ai_reason,

    target_job_id:
      lead.target_job_id === null ? null : String(lead.target_job_id),

    status: lead.status,

    reviewed_by: lead.reviewed_by === null ? null : String(lead.reviewed_by),

    reviewed_at: lead.reviewed_at,

    converted_candidate_id:
      lead.converted_candidate_id === null
        ? null
        : String(lead.converted_candidate_id),

    converted_application_id:
      lead.converted_application_id === null
        ? null
        : String(lead.converted_application_id),

    created_at: lead.created_at,
    updated_at: lead.updated_at,

    job: lead.jobs
      ? {
          id: String(lead.jobs.id),
          title: lead.jobs.title,
          status: lead.jobs.status,
        }
      : null,

    reviewer: lead.reviewers
      ? {
          id: String(lead.reviewers.id),
          name: lead.reviewers.name,
          email: lead.reviewers.email,
        }
      : null,

    converted_candidate: lead.converted_candidates
      ? {
          id: String(lead.converted_candidates.id),
          full_name: lead.converted_candidates.full_name,
        }
      : null,

    converted_application: lead.converted_applications
      ? {
          id: String(lead.converted_applications.id),
          status: lead.converted_applications.status,
        }
      : null,
  };
}

export const candidateLeadsApi = {
  list: async (
    params: CandidateLeadListParams = {},
  ): Promise<CandidateLeadListResponse> => {
    const { data } = await api.get<
      ApiSuccess<BackendCandidateLeadListResponse>
    >("/candidate-leads", {
      params,
    });

    return {
      items: data.data.items.map(mapCandidateLead),
      pagination: data.data.pagination,
    };
  },

  get: async (id: string): Promise<CandidateLead> => {
    const { data } = await api.get<ApiSuccess<BackendCandidateLead>>(
      `/candidate-leads/${id}`,
    );

    return mapCandidateLead(data.data);
  },

  update: async (
    id: string,
    payload: UpdateCandidateLeadPayload,
  ): Promise<CandidateLead> => {
    const { data } = await api.patch<ApiSuccess<BackendCandidateLead>>(
      `/candidate-leads/${id}`,
      payload,
    );

    return mapCandidateLead(data.data);
  },

  convert: async (
    id: string,
    payload: ConvertCandidateLeadPayload,
  ): Promise<ConvertCandidateLeadResult> => {
    const { data } = await api.post<ApiSuccess<ConvertCandidateLeadResult>>(
      `/candidate-leads/${id}/convert`,
      payload,
    );

    return {
      lead_id: String(data.data.lead_id),
      candidate_id: String(data.data.candidate_id),
      application_id:
        data.data.application_id === null
          ? null
          : String(data.data.application_id),
    };
  },
};
