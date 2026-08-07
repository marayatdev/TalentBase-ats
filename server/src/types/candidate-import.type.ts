import { candidate_imports_source } from "@/generated/prisma/client";

export interface ParseCandidateTextDto {
  raw_text: string;
  source?: candidate_imports_source;
  source_url?: string;
}

export interface ParsedCandidateText {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  current_position: string | null;
  target_position: string | null;
  summary: string | null;
  skills: string[];
}

export interface ManualCandidateImportDto {
  full_name: string;
  email?: string;
  phone?: string;
  current_position?: string;

  source: candidate_imports_source;
  source_url?: string;
  raw_text?: string;

  job_id: bigint;
  imported_by?: bigint;
}

export interface ManualCandidateImportResult {
  candidate_id: bigint;
  application_id: bigint;
  import_id: bigint;
  is_duplicate: boolean;
}

export interface GetImportHistoryQuery {
  page?: number;
  limit?: number;

  source?: "linkedin" | "facebook" | "manual";

  import_status?: "pending" | "completed" | "failed" | "duplicate";
}

export interface AnalyzeCandidatePostDto {
  raw_text: string;

  source:
    | "facebook"
    | "linkedin";

  source_url?:
    | string
    | null;

  job_id:
    | string
    | number
    | bigint;
  target_position?: string;
}

export interface CandidatePostAnalysis {
  is_job_seeker: boolean;
  matches_target_position: boolean;

  detected_position: string | null;
  target_position: string;

  confidence: number;
  reason: string;

  full_name: string | null;
  email: string | null;
  phone: string | null;

  skills: string[];

  source: candidate_imports_source;
  source_url: string | null;
}
