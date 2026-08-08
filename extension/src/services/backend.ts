import type {
  CandidateLead,
  CreateCandidateLeadPayload,
} from "../types/candidate-lead";
import type {
  ApiSuccess,
  CandidatePostAnalysis,
  FacebookPost,
} from "../types/facebook-post";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export async function analyzeFacebookPost(
  post: FacebookPost,
  targetPosition: string,
): Promise<CandidatePostAnalysis> {
  const response = await fetch(
    `${API_BASE_URL}/candidate-imports/analyze-post`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        raw_text: post.text,
        source: "facebook",
        source_url: post.url,
        target_position: targetPosition,
      }),
    },
  );

  const body = (await response.json()) as
    | ApiSuccess<CandidatePostAnalysis>
    | {
      success: false;
      message?: string;
    };

  if (!response.ok || !body.success) {
    throw new Error(body.message ?? "AI post analysis failed");
  }

  return body.data;
}

export async function createCandidateLead(
  payload: CreateCandidateLeadPayload,
): Promise<CandidateLead> {
  const response = await fetch(`${API_BASE_URL}/candidate-leads`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as
    | ApiSuccess<CandidateLead>
    | {
      success: false;
      message?: string;
    };

  if (!response.ok || !body.success) {
    throw new Error(body.message ?? "Could not save candidate lead");
  }

  return body.data;
}
