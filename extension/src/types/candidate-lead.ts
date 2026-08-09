export interface CreateCandidateLeadPayload {
  source: "facebook" | "linkedin" | "manual";
  source_url?: string | null;
  raw_text: string;

  detected_name?: string | null;
  detected_email?: string | null;
  detected_phone?: string | null;
  detected_position?: string | null;

  skills?: string[];

  ai_confidence?: number | null;
  ai_reason?: string | null;

  target_job_id?: string | null;
}

export interface CandidateLead {
  id: string;
  source: "facebook" | "linkedin" | "manual";
  source_url: string | null;
  raw_text: string;

  detected_name: string | null;
  detected_email: string | null;
  detected_phone: string | null;
  detected_position: string | null;

  skills: string[];
  ai_confidence: number | null;
  ai_reason: string | null;

  status:
    | "new"
    | "reviewing"
    | "approved"
    | "rejected"
    | "duplicate"
    | "converted";

  created_at: string;
}
