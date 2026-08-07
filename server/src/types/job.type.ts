import { jobs_employment_type, jobs_status } from "@/generated/prisma/client";

export interface CreateJobDto {
  title: string;
  description?: string;
  requirements?: string;
  employment_type?: jobs_employment_type;
  minimum_experience_years?: number;
  salary_min?: number;
  salary_max?: number;
  number_of_positions?: number;
  status?: jobs_status;
  created_by?: bigint;
}

export interface UpdateJobDto {
  title?: string;
  description?: string | null;
  requirements?: string | null;
  employment_type?: jobs_employment_type;
  minimum_experience_years?: number;
  salary_min?: number | null;
  salary_max?: number | null;
  number_of_positions?: number;
  status?: jobs_status;
}

export interface GetJobsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: jobs_status;
  employment_type?: jobs_employment_type;
}
