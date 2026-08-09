import { api } from "./axios";

import type {
  ApiSuccess,
  ListParams,
} from "@/types/api";

import type {
  Candidate,
  CandidateSource,
  Certificate,
  CreateCandidateWithResumeResult,
  Education,
  Language,
  ParseStatus,
  WorkExperience,
} from "@/types/domain";

export type CandidatePayload = Omit<
  Candidate,
  | "id"
  | "created_at"
  | "updated_at"
  | "resume_count"
  | "application_count"
  | "skills_count"
  | "skills"
  | "work_experiences"
  | "education"
  | "languages"
  | "certificates"
  | "resumes"
>;

interface BackendCandidateResume {
  id: string;
  candidate_id: string;

  original_file_name: string;
  file_url: string;

  mime_type: string | null;

  file_size:
  | string
  | number
  | null;

  is_primary: boolean;

  parse_status: ParseStatus;

  uploaded_at: string;
}

interface BackendCandidate {
  id: string;

  full_name: string;

  email: string | null;

  phone: string | null;

  linkedin_url:
  | string
  | null;

  current_position:
  | string
  | null;

  total_experience_years:
  | string
  | number
  | null;

  source: CandidateSource;

  source_url:
  | string
  | null;

  created_at: string;
  updated_at: string;

  candidate_skills?: Array<{
    skills: {
      id: string;
      name: string;
    };

    proficiency?:
    | string
    | null;
  }>;

  candidate_experiences?: WorkExperience[];

  candidate_educations?: Education[];

  candidate_languages?: Language[];

  candidate_certificates?: Certificate[];

  resumes?: BackendCandidateResume[];
}

export interface CreateCandidateWithResumePayload {
  full_name: string;

  email?: string;

  phone?: string;

  linkedin_url?: string;

  current_position?: string;

  total_experience_years?: number;

  source?: CandidateSource;

  source_url?: string;

  job_id?: string;

  resume?: File;
}

export interface CandidatesListResponse {
  candidates: Candidate[];

  pagination: {
    page: number;

    limit: number;

    total: number;

    totalPages: number;

    hasNextPage: boolean;

    hasPreviousPage: boolean;
  };
}

interface BackendCandidatesListResponse {
  candidates: BackendCandidate[];

  pagination:
  CandidatesListResponse["pagination"];
}

function mapBackendCandidate(
  candidate: BackendCandidate,
): Candidate {
  return {
    id:
      String(
        candidate.id,
      ),

    full_name:
      candidate.full_name,

    email:
      candidate.email,

    phone:
      candidate.phone,

    linkedin_url:
      candidate.linkedin_url,

    current_position:
      candidate.current_position,

    total_experience_years:
      candidate.total_experience_years ===
        null
        ? null
        : Number(
          candidate.total_experience_years,
        ),

    source:
      candidate.source,

    source_url:
      candidate.source_url,

    skills:
      candidate.candidate_skills?.map(
        (item) => ({
          id:
            String(
              item.skills.id,
            ),

          name:
            item.skills.name,

          level:
            item.proficiency ??
            null,
        }),
      ) ?? [],

    work_experiences:
      candidate.candidate_experiences ??
      [],

    education:
      candidate.candidate_educations ??
      [],

    languages:
      candidate.candidate_languages ??
      [],

    certificates:
      candidate.candidate_certificates ??
      [],

    resumes:
      candidate.resumes?.map(
        (resume) => ({
          id:
            String(
              resume.id,
            ),

          candidate_id:
            String(
              resume.candidate_id,
            ),

          original_file_name:
            resume.original_file_name,

          file_url:
            resume.file_url,

          file_size:
            resume.file_size ===
              null
              ? null
              : Number(
                resume.file_size,
              ),

          mime_type:
            resume.mime_type,

          parse_status:
            resume.parse_status,

          uploaded_at:
            resume.uploaded_at,
        }),
      ) ?? [],

    resume_count:
      candidate.resumes?.length ??
      0,

    created_at:
      candidate.created_at,

    updated_at:
      candidate.updated_at,
  };
}

export const candidatesApi = {
  list: async (
    params: ListParams & {
      source?: string;
    } = {},
  ): Promise<CandidatesListResponse> => {
    const requestParams = {
      page:
        params.page,

      limit:
        params.page_size,

      search:
        params.search,

      source:
        params.source,
    };

    const {
      data,
    } = await api.get<
      ApiSuccess<BackendCandidatesListResponse>
    >(
      "/candidates",
      {
        params:
          requestParams,
      },
    );

    return {
      candidates:
        data.data.candidates.map(
          mapBackendCandidate,
        ),

      pagination:
        data.data.pagination,
    };
  },

  get: async (
    id: string,
  ): Promise<Candidate> => {
    const {
      data,
    } = await api.get<
      ApiSuccess<BackendCandidate>
    >(
      `/candidates/${id}`,
    );

    return mapBackendCandidate(
      data.data,
    );
  },

  create: async (
    payload: CandidatePayload,
  ): Promise<Candidate> => {
    const {
      data,
    } = await api.post<
      ApiSuccess<BackendCandidate>
    >(
      "/candidates",
      payload,
    );

    return mapBackendCandidate(
      data.data,
    );
  },

  update: async (
    id: string,
    payload:
      Partial<CandidatePayload>,
  ): Promise<Candidate> => {
    const {
      data,
    } = await api.patch<
      ApiSuccess<BackendCandidate>
    >(
      `/candidates/${id}`,
      payload,
    );

    return mapBackendCandidate(
      data.data,
    );
  },

  remove: async (
    id: string,
  ): Promise<void> => {
    await api.delete(
      `/candidates/${id}`,
    );
  },

  createWithResume:
    async (
      payload:
        CreateCandidateWithResumePayload,
    ): Promise<CreateCandidateWithResumeResult> => {
      const formData =
        new FormData();

      formData.append(
        "full_name",
        payload.full_name,
      );

      if (
        payload.email
      ) {
        formData.append(
          "email",
          payload.email,
        );
      }

      if (
        payload.phone
      ) {
        formData.append(
          "phone",
          payload.phone,
        );
      }

      if (
        payload.linkedin_url
      ) {
        formData.append(
          "linkedin_url",
          payload.linkedin_url,
        );
      }

      if (
        payload.current_position
      ) {
        formData.append(
          "current_position",
          payload.current_position,
        );
      }

      if (
        payload.total_experience_years !==
        undefined
      ) {
        formData.append(
          "total_experience_years",
          String(
            payload.total_experience_years,
          ),
        );
      }

      if (
        payload.source
      ) {
        formData.append(
          "source",
          payload.source,
        );
      }

      if (
        payload.source_url
      ) {
        formData.append(
          "source_url",
          payload.source_url,
        );
      }

      if (
        payload.job_id
      ) {
        formData.append(
          "job_id",
          payload.job_id,
        );
      }

      if (
        payload.resume
      ) {
        formData.append(
          "resume",
          payload.resume,
        );
      }

      const {
        data,
      } = await api.post<
        ApiSuccess<CreateCandidateWithResumeResult>
      >(
        "/candidates/with-resume",
        formData,
      );

      return data.data;
    },
};