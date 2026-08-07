import { api } from "./axios";

import type { ApiSuccess } from "@/types/api";
import type {
  AIJobMatch,
  MatchRecommendation,
} from "@/types/domain";

interface BackendSkillDetail {
  name: string;
  importance: "required" | "optional";
  matched: boolean;
  candidate_evidence?: string | null;
}

interface BackendAIJobMatch {
  /*
   * บาง response ที่มาจากข้อมูล AI โดยตรงอาจไม่มี id,
   * application_id และ created_at
   */
  id?: string;
  application_id?: string;

  overall_score: string | number;
  skill_score: string | number;
  experience_score: string | number;
  education_score: string | number;
  language_score: string | number;

  recommendation: MatchRecommendation;
  summary?: string | null;

  matched_skills?: string[] | null;
  missing_required_skills?: string[] | null;
  additional_skills?: string[] | null;

  strengths?: string[] | null;
  concerns?: string[] | null;

  skill_details?: BackendSkillDetail[] | null;

  interview_questions?: string[] | null;

  created_at?: string;
  updated_at?: string;
}

interface AIJobMatchResponse {
  application: {
    id: string;
  };

  match: BackendAIJobMatch;
}

function mapBackendAIJobMatch(
  value: BackendAIJobMatch,
  fallbackApplicationId?: string,
): AIJobMatch {
  return {
    id: value.id ? String(value.id) : "",

    application_id: value.application_id
      ? String(value.application_id)
      : fallbackApplicationId ?? "",

    overall_score: Number(value.overall_score),
    skill_score: Number(value.skill_score),
    experience_score: Number(value.experience_score),
    education_score: Number(value.education_score),
    language_score: Number(value.language_score),

    recommendation: value.recommendation,

    summary: value.summary ?? "",

    matched_skills: value.matched_skills ?? [],
    missing_required_skills:
      value.missing_required_skills ?? [],
    additional_skills:
      value.additional_skills ?? [],

    strengths: value.strengths ?? [],
    concerns: value.concerns ?? [],

    skill_details:
      value.skill_details?.map((row) => ({
        name: row.name,

        importance: row.importance,

        matched: row.matched,

        candidate_evidence:
          row.candidate_evidence ?? null,
      })) ?? [],

    interview_questions:
      value.interview_questions ?? [],

    created_at:
      value.created_at ?? new Date().toISOString(),
  };
}

function extractMatch(
  value: BackendAIJobMatch | AIJobMatchResponse,
): {
  match: BackendAIJobMatch;
  applicationId?: string;
} {
  if (
    value &&
    typeof value === "object" &&
    "match" in value
  ) {
    return {
      match: value.match,
      applicationId: value.application?.id,
    };
  }

  return {
    match: value,
  };
}

export const aiJobMatchesApi = {
  getByApplication: async (
    applicationId: string,
  ): Promise<AIJobMatch | null> => {
    try {
      const { data } = await api.get<
        ApiSuccess<
          BackendAIJobMatch | AIJobMatchResponse
        >
      >(
        `/ai-job-matches/application/${applicationId}`,
      );

      const extracted = extractMatch(data.data);

      return mapBackendAIJobMatch(
        extracted.match,
        extracted.applicationId ?? applicationId,
      );
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

        /*
         * ยังไม่เคยวิเคราะห์
         * ให้ UI แสดง Empty State
         */
        if (response?.status === 404) {
          return null;
        }
      }

      throw error;
    }
  },

  run: async (
    applicationId: string,
  ): Promise<AIJobMatch> => {
    const { data } = await api.post<
      ApiSuccess<
        BackendAIJobMatch | AIJobMatchResponse
      >
    >(
      `/ai-job-matches/application/${applicationId}`,
    );

    const extracted = extractMatch(data.data);

    return mapBackendAIJobMatch(
      extracted.match,
      extracted.applicationId ?? applicationId,
    );
  },
};