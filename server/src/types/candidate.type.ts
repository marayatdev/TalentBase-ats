import { candidates_source } from "@/generated/prisma/client";

export interface CreateCandidateDto {
  full_name: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  current_position?: string;
  total_experience_years?: number;
  source?: candidates_source;
  source_url?: string;
}

export interface UpdateCandidateDto {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  current_position?: string | null;
  total_experience_years?: number;
  source?: candidates_source;
  source_url?: string | null;
}

export interface GetCandidatesQuery {
  page?: number;
  limit?: number;
  search?: string;
  source?: candidates_source;
}

export interface CreateCandidateWithResumeDto {
  full_name: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  current_position?: string;
  total_experience_years?: number;
  source?: candidates_source;
  source_url?: string;

  job_id?: bigint;
  assigned_hr_id?: bigint;
}
