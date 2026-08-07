import { api } from "./axios";

import type { ApiSuccess } from "@/types/api";
import type {
  AIResumeResult,
  AIResumeSkill,
  AIResumeWorkExperience,
  AIResumeEducation,
  AIResumeLanguage,
  AIResumeCertificate,
} from "@/types/domain";

interface BackendParsedSkill {
  name: string;
  proficiency?: string | null;
  experience_years?: number | null;
}

interface BackendParsedExperience {
  company?: string | null;
  position?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
}

interface BackendParsedEducation {
  institution?: string | null;
  degree?: string | null;
  field_of_study?: string | null;
  start_year?: number | null;
  end_year?: number | null;
}

interface BackendParsedLanguage {
  name: string;
  proficiency?: string | null;
}

interface BackendParsedCertificate {
  name: string;
  issuing_organization?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  credential_id?: string | null;
  credential_url?: string | null;
}

interface BackendParsedData {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  current_position?: string | null;
  total_experience_years?: number | null;

  summary?: string | null;

  skills?: BackendParsedSkill[] | null;
  experiences?: BackendParsedExperience[] | null;
  educations?: BackendParsedEducation[] | null;
  languages?: BackendParsedLanguage[] | null;
  certificates?: BackendParsedCertificate[] | null;
}

interface BackendAIResumeResult {
  id: string;
  resume_id: string;

  summary?: string | null;
  parsed_data?: BackendParsedData | null;

  model_name?: string | null;
  error_message?: string | null;
  processed_at?: string | null;
  created_at?: string;
}

interface BackendResumeAnalysisResponse {
  id: string;
  candidate_id: string;

  original_file_name: string;
  file_url?: string | null;
  mime_type?: string | null;
  file_size?: string | number | null;

  parse_status:
    | "pending"
    | "processing"
    | "completed"
    | "failed";

  uploaded_at: string;

  ai_resume_results?: BackendAIResumeResult | null;
}

interface BackendResumeApplication {
  id: string;
  job_id: string;

  jobs: {
    id: string;
    title: string;
    status?: string;
  };
}

interface BackendResumeAnalysisResponse {
  id: string;
  candidate_id: string;

  original_file_name: string;
  file_url?: string | null;
  mime_type?: string | null;
  file_size?: string | number | null;

  parse_status:
    | "pending"
    | "processing"
    | "completed"
    | "failed";

  uploaded_at: string;

  applications?: BackendResumeApplication[] | null;

  ai_resume_results?: BackendAIResumeResult | null;
}

function mapResumeAnalysis(
  resume: BackendResumeAnalysisResponse,
): AIResumeResult {
  const aiResult = resume.ai_resume_results;
  const parsed = aiResult?.parsed_data;

  const skills: AIResumeSkill[] =
    parsed?.skills?.map((skill) => ({
      name: skill.name,
      proficiency: skill.proficiency ?? null,
      experience_years:
        skill.experience_years ?? null,
    })) ?? [];

  const workExperiences: AIResumeWorkExperience[] =
    parsed?.experiences?.map((experience) => ({
      position: experience.position ?? "",
      company: experience.company ?? "",
      start_date: experience.start_date ?? null,
      end_date: experience.end_date ?? null,
      description: experience.description ?? null,
    })) ?? [];

  const education: AIResumeEducation[] =
    parsed?.educations?.map((item) => ({
      degree: item.degree ?? "",
      institution: item.institution ?? "",
      field_of_study:
        item.field_of_study ?? null,
      graduation_year:
        item.end_year ?? null,
    })) ?? [];

  const languages: AIResumeLanguage[] =
    parsed?.languages?.map((language) => ({
      name: language.name,
      proficiency:
        language.proficiency ?? null,
    })) ?? [];

  const certificates: AIResumeCertificate[] =
    parsed?.certificates?.map((certificate) => ({
      name: certificate.name,
      issuer:
        certificate.issuing_organization ?? null,
      issued_at:
        certificate.issue_date ?? null,
    })) ?? [];

    

  return {
  id: aiResult?.id
    ? String(aiResult.id)
    : String(resume.id),

  resume_id: String(resume.id),

  candidate_id: String(resume.candidate_id),

  status: resume.parse_status,

  summary:
    aiResult?.summary ??
    parsed?.summary ??
    null,

  model_name:
    aiResult?.model_name ?? null,

  processed_at:
    aiResult?.processed_at ?? null,

  error_message:
    aiResult?.error_message ?? null,

  raw_text: null,

  extracted_profile: {
    full_name:
      parsed?.full_name ?? null,

    email:
      parsed?.email ?? null,

    phone:
      parsed?.phone ?? null,

    current_position:
      parsed?.current_position ?? null,
  },

  skills,
  work_experiences: workExperiences,
  education,
  languages,
  certificates,

  applications:
    resume.applications?.map((application) => ({
      id: String(application.id),
      job_id: String(application.job_id),

      job: {
        id: String(application.jobs.id),
        title: application.jobs.title,
        status: application.jobs.status,
      },
    })) ?? [],
};
}

export const aiResumesApi = {
  getByResumeId: async (
    resumeId: string,
  ): Promise<AIResumeResult | null> => {
    try {
      const { data } = await api.get<
        ApiSuccess<BackendResumeAnalysisResponse>
      >(`/ai-resumes/${resumeId}/result`);

      return mapResumeAnalysis(data.data);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const response = (
          error as {
            response?: {
              status?: number;
            };
          }
        ).response;

        if (response?.status === 404) {
          return null;
        }
      }

      throw error;
    }
  },

  parse: async (
    resumeId: string,
  ): Promise<AIResumeResult> => {
    const { data } = await api.post<
      ApiSuccess<BackendResumeAnalysisResponse>
    >(`/ai-resumes/${resumeId}/parse`);

    return mapResumeAnalysis(data.data);
  },
};