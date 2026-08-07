import { applications_status } from "@/generated/prisma/client";

export interface CreateApplicationDto {
  candidate_id: bigint;
  job_id: bigint;
  resume_id?: bigint;
  assigned_hr_id?: bigint;
}

export interface UpdateApplicationStatusDto {
  status: applications_status;
}

export interface MoveApplicationStageDto {
  stage_id: bigint;
  changed_by?: bigint;
  note?: string;
}

export interface GetApplicationsQuery {
  page?: number;
  limit?: number;
  search?: string;
  job_id?: bigint;
  candidate_id?: bigint;
  stage_id?: bigint;
  status?: applications_status;
}
