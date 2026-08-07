import { api } from "./axios";
import type { ApiSuccess } from "@/types/api";
import type { ParseStatus, Resume } from "@/types/domain";

interface BackendResume {
  id: string;
  candidate_id: string;
  original_file_name: string;
  file_url: string;
  file_size: string | number | null;
  mime_type?: string | null;
  parse_status: ParseStatus;
  uploaded_at: string;
}

interface BackendResumeListResponse {
  resumes: BackendResume[];
}

function mapBackendResume(value: BackendResume): Resume {
  return {
    id: String(value.id),
    candidate_id: String(value.candidate_id),
    original_file_name: value.original_file_name,
    file_url: value.file_url,
    file_size: value.file_size === null ? null : Number(value.file_size),
    mime_type: value.mime_type ?? null,
    parse_status: value.parse_status,
    uploaded_at: value.uploaded_at,
  };
}

export const resumesApi = {
  listByCandidate: async (candidateId: string): Promise<Resume[]> => {
    const { data } = await api.get<
      ApiSuccess<BackendResume[] | BackendResumeListResponse>
    >(`/resumes/candidate/${candidateId}`);

    const rawResumes = Array.isArray(data.data) ? data.data : data.data.resumes;

    return rawResumes.map(mapBackendResume);
  },

  get: async (resumeId: string): Promise<Resume> => {
    const { data } = await api.get<ApiSuccess<BackendResume>>(
      `/resumes/${resumeId}`,
    );

    return mapBackendResume(data.data);
  },

  upload: async (candidateId: string, file: File): Promise<Resume> => {
    const formData = new FormData();

    formData.append("resume", file);

    const { data } = await api.post<ApiSuccess<BackendResume>>(
      `/resumes/candidate/${candidateId}`,
      formData,
    );

    return mapBackendResume(data.data);
  },

  remove: async (resumeId: string): Promise<void> => {
    await api.delete(`/resumes/${resumeId}`);
  },
};
