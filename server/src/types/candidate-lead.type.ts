import type {
  candidate_leads_source,
  candidate_leads_status,
} from "@/generated/prisma/client";

export interface CreateCandidateLeadDto {
  source: candidate_leads_source;
  source_url?: string | null;
  raw_text: string;

  detected_name?: string | null;
  detected_email?: string | null;
  detected_phone?: string | null;
  detected_position?: string | null;

  skills?: string[];

  ai_confidence?: number | null;
  ai_reason?: string | null;

  target_job_id?: bigint | null;
}

export interface GetCandidateLeadsQuery {
  page?: number;
  limit?: number;
  search?: string;
  source?: candidate_leads_source;
  status?: candidate_leads_status;
  target_job_id?: bigint;
}

export interface CreateCandidateLeadDto {
  source: candidate_leads_source;
  source_url?: string | null;
  raw_text: string;

  detected_name?: string | null;
  detected_email?: string | null;
  detected_phone?: string | null;
  detected_position?: string | null;

  skills?: string[];

  ai_confidence?: number | null;
  ai_reason?: string | null;

  target_job_id?: bigint | null;
}

export interface GetCandidateLeadsQuery {
  page?: number;
  limit?: number;
  search?: string;
  source?: candidate_leads_source;
  status?: candidate_leads_status;
  target_job_id?: bigint;
}

/*
 * ใช้แก้ข้อมูล Lead ก่อน Convert
 */
export interface UpdateCandidateLeadDto {
  detected_name?: string | null;
  detected_email?: string | null;
  detected_phone?: string | null;
  detected_position?: string | null;

  skills?: string[];

  target_job_id?: bigint | null;

  status?: candidate_leads_status;
  reviewed_by?: bigint | null;
}

/*
 * ข้อมูลที่ HR สามารถแก้ทับค่าจาก AI ตอน Convert
 */
export interface ConvertCandidateLeadDto {
  full_name?: string;

  email?: string | null;
  phone?: string | null;

  linkedin_url?: string | null;
  current_position?: string | null;

  total_experience_years?: number;

  job_id?: bigint | null;
  assigned_hr_id?: bigint | null;

  create_application?: boolean;
}

export interface ConvertCandidateLeadResult {
  lead_id: bigint;
  candidate_id: bigint;
  application_id: bigint | null;

  candidate: unknown;
  application: unknown | null;
}
