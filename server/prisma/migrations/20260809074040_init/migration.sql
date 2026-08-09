-- CreateEnum
CREATE TYPE "interviews_status" AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');

-- CreateEnum
CREATE TYPE "candidate_skills_proficiency" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "users_role" AS ENUM ('admin', 'hr', 'interviewer');

-- CreateEnum
CREATE TYPE "pipeline_stages_stage_type" AS ENUM ('active', 'hired', 'rejected');

-- CreateEnum
CREATE TYPE "jobs_employment_type" AS ENUM ('full_time', 'part_time', 'contract', 'internship');

-- CreateEnum
CREATE TYPE "resumes_parse_status" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "candidates_source" AS ENUM ('manual', 'website', 'email', 'linkedin', 'facebook', 'referral');

-- CreateEnum
CREATE TYPE "applications_status" AS ENUM ('active', 'hired', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "jobs_status" AS ENUM ('draft', 'open', 'closed');

-- CreateEnum
CREATE TYPE "candidate_imports_source" AS ENUM ('linkedin', 'facebook', 'manual');

-- CreateEnum
CREATE TYPE "candidate_imports_import_status" AS ENUM ('pending', 'completed', 'failed', 'duplicate');

-- CreateEnum
CREATE TYPE "candidate_leads_source" AS ENUM ('facebook', 'linkedin', 'manual');

-- CreateEnum
CREATE TYPE "candidate_leads_status" AS ENUM ('new', 'reviewing', 'approved', 'rejected', 'converted', 'duplicate');

-- CreateTable
CREATE TABLE "ai_resume_results" (
    "id" BIGSERIAL NOT NULL,
    "resume_id" BIGINT NOT NULL,
    "extracted_text" TEXT,
    "summary" TEXT,
    "parsed_data" JSONB,
    "model_name" VARCHAR(100),
    "error_message" TEXT,
    "processed_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_resume_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_stage_histories" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "from_stage_id" BIGINT,
    "to_stage_id" BIGINT NOT NULL,
    "changed_by" BIGINT,
    "note" TEXT,
    "changed_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_stage_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" BIGSERIAL NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "job_id" BIGINT NOT NULL,
    "resume_id" BIGINT,
    "current_stage_id" BIGINT,
    "assigned_hr_id" BIGINT,
    "ai_match_score" DECIMAL(5,2),
    "ai_match_summary" TEXT,
    "status" "applications_status" NOT NULL DEFAULT 'active',
    "applied_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_skills" (
    "candidate_id" BIGINT NOT NULL,
    "skill_id" BIGINT NOT NULL,
    "experience_years" DECIMAL(4,1),
    "proficiency" "candidate_skills_proficiency",

    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("candidate_id","skill_id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" BIGSERIAL NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "linkedin_url" VARCHAR(500),
    "current_position" VARCHAR(150),
    "total_experience_years" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "source" "candidates_source" NOT NULL DEFAULT 'manual',
    "source_url" VARCHAR(1000),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "job_id" BIGINT NOT NULL,
    "skill_id" BIGINT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.00,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("job_id","skill_id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "employment_type" "jobs_employment_type" NOT NULL DEFAULT 'full_time',
    "minimum_experience_years" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "salary_min" DECIMAL(12,2),
    "salary_max" DECIMAL(12,2),
    "number_of_positions" INTEGER NOT NULL DEFAULT 1,
    "status" "jobs_status" NOT NULL DEFAULT 'open',
    "created_by" BIGINT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "stage_type" "pipeline_stages_stage_type" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" BIGSERIAL NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(1000) NOT NULL,
    "mime_type" VARCHAR(100),
    "file_size" BIGINT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "parse_status" "resumes_parse_status" NOT NULL DEFAULT 'pending',
    "uploaded_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "users_role" NOT NULL DEFAULT 'hr',
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_certificates" (
    "id" BIGSERIAL NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "issuing_organization" VARCHAR(255),
    "issue_date" VARCHAR(7),
    "expiration_date" VARCHAR(7),
    "credential_id" VARCHAR(255),
    "credential_url" VARCHAR(1000),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_educations" (
    "id" BIGSERIAL NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "institution" VARCHAR(255) NOT NULL,
    "degree" VARCHAR(255),
    "field_of_study" VARCHAR(255),
    "start_year" INTEGER,
    "end_year" INTEGER,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_experiences" (
    "id" BIGSERIAL NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "company" VARCHAR(255) NOT NULL,
    "position" VARCHAR(255) NOT NULL,
    "start_date" VARCHAR(7),
    "end_date" VARCHAR(7),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_languages" (
    "id" BIGSERIAL NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "language" VARCHAR(100) NOT NULL,
    "level" VARCHAR(100),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_imports" (
    "id" BIGSERIAL NOT NULL,
    "candidate_id" BIGINT,
    "application_id" BIGINT,
    "job_id" BIGINT,
    "imported_by" BIGINT,
    "source" "candidate_imports_source" NOT NULL DEFAULT 'manual',
    "source_url" VARCHAR(1000),
    "raw_text" TEXT,
    "raw_data" JSONB,
    "import_status" "candidate_imports_import_status" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_leads" (
    "id" BIGSERIAL NOT NULL,
    "source" "candidate_leads_source" NOT NULL,
    "source_url" VARCHAR(1000),
    "raw_text" TEXT NOT NULL,
    "detected_name" VARCHAR(150),
    "detected_email" VARCHAR(255),
    "detected_phone" VARCHAR(30),
    "detected_position" VARCHAR(150),
    "skills" JSONB,
    "ai_confidence" DECIMAL(5,2),
    "ai_reason" TEXT,
    "target_job_id" BIGINT,
    "status" "candidate_leads_status" NOT NULL DEFAULT 'new',
    "reviewed_by" BIGINT,
    "reviewed_at" TIMESTAMP(0),
    "converted_candidate_id" BIGINT,
    "converted_application_id" BIGINT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_accounts" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "google_email" VARCHAR(255) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT NOT NULL,
    "token_expiry" TIMESTAMP(0),
    "scope" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "scheduled_by" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMP(0) NOT NULL,
    "end_at" TIMESTAMP(0) NOT NULL,
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Bangkok',
    "status" "interviews_status" NOT NULL DEFAULT 'scheduled',
    "candidate_email" VARCHAR(255) NOT NULL,
    "interviewer_emails" JSONB NOT NULL,
    "google_calendar_id" VARCHAR(255),
    "google_event_id" VARCHAR(255),
    "google_event_url" VARCHAR(1000),
    "meet_url" VARCHAR(1000),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uk_ai_resume_result_resume" ON "ai_resume_results"("resume_id");

-- CreateIndex
CREATE INDEX "idx_stage_history_from_stage" ON "application_stage_histories"("from_stage_id");

-- CreateIndex
CREATE INDEX "idx_stage_history_to_stage" ON "application_stage_histories"("to_stage_id");

-- CreateIndex
CREATE INDEX "idx_stage_history_user" ON "application_stage_histories"("changed_by");

-- CreateIndex
CREATE INDEX "idx_stage_history_application" ON "application_stage_histories"("application_id");

-- CreateIndex
CREATE INDEX "idx_applications_hr" ON "applications"("assigned_hr_id");

-- CreateIndex
CREATE INDEX "idx_applications_resume" ON "applications"("resume_id");

-- CreateIndex
CREATE INDEX "idx_applications_job" ON "applications"("job_id");

-- CreateIndex
CREATE INDEX "idx_applications_stage" ON "applications"("current_stage_id");

-- CreateIndex
CREATE INDEX "idx_applications_status" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uk_candidate_job" ON "applications"("candidate_id", "job_id");

-- CreateIndex
CREATE INDEX "idx_candidate_skills_skill" ON "candidate_skills"("skill_id");

-- CreateIndex
CREATE INDEX "idx_candidates_email" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "idx_candidates_name" ON "candidates"("full_name");

-- CreateIndex
CREATE INDEX "idx_candidates_phone" ON "candidates"("phone");

-- CreateIndex
CREATE INDEX "idx_job_skills_skill" ON "job_skills"("skill_id");

-- CreateIndex
CREATE INDEX "idx_jobs_created_by" ON "jobs"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "uk_job_stage_name" ON "pipeline_stages"("job_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uk_job_stage_order" ON "pipeline_stages"("job_id", "stage_order");

-- CreateIndex
CREATE INDEX "idx_resumes_candidate" ON "resumes"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "name" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_candidate_certificates_candidate_id" ON "candidate_certificates"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_certificates_name" ON "candidate_certificates"("name");

-- CreateIndex
CREATE INDEX "idx_candidate_certificates_organization" ON "candidate_certificates"("issuing_organization");

-- CreateIndex
CREATE INDEX "idx_candidate_educations_candidate_id" ON "candidate_educations"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_educations_field_of_study" ON "candidate_educations"("field_of_study");

-- CreateIndex
CREATE INDEX "idx_candidate_educations_institution" ON "candidate_educations"("institution");

-- CreateIndex
CREATE INDEX "idx_candidate_experiences_candidate_id" ON "candidate_experiences"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_experiences_company" ON "candidate_experiences"("company");

-- CreateIndex
CREATE INDEX "idx_candidate_experiences_position" ON "candidate_experiences"("position");

-- CreateIndex
CREATE INDEX "idx_candidate_languages_candidate_id" ON "candidate_languages"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_languages_language" ON "candidate_languages"("language");

-- CreateIndex
CREATE UNIQUE INDEX "uk_candidate_language" ON "candidate_languages"("candidate_id", "language");

-- CreateIndex
CREATE INDEX "idx_candidate_imports_user" ON "candidate_imports"("imported_by");

-- CreateIndex
CREATE INDEX "idx_candidate_imports_application_id" ON "candidate_imports"("application_id");

-- CreateIndex
CREATE INDEX "idx_candidate_imports_candidate_id" ON "candidate_imports"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_imports_created_at" ON "candidate_imports"("created_at");

-- CreateIndex
CREATE INDEX "idx_candidate_imports_job_id" ON "candidate_imports"("job_id");

-- CreateIndex
CREATE INDEX "idx_candidate_imports_source" ON "candidate_imports"("source");

-- CreateIndex
CREATE INDEX "idx_candidate_imports_status" ON "candidate_imports"("import_status");

-- CreateIndex
CREATE INDEX "idx_candidate_leads_application" ON "candidate_leads"("converted_application_id");

-- CreateIndex
CREATE INDEX "idx_candidate_leads_candidate" ON "candidate_leads"("converted_candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_leads_job" ON "candidate_leads"("target_job_id");

-- CreateIndex
CREATE INDEX "idx_candidate_leads_reviewer" ON "candidate_leads"("reviewed_by");

-- CreateIndex
CREATE UNIQUE INDEX "user_id" ON "google_accounts"("user_id");

-- CreateIndex
CREATE INDEX "idx_google_accounts_email" ON "google_accounts"("google_email");

-- CreateIndex
CREATE UNIQUE INDEX "interviews_google_event_id_key" ON "interviews"("google_event_id");

-- CreateIndex
CREATE INDEX "interviews_application_id_idx" ON "interviews"("application_id");

-- CreateIndex
CREATE INDEX "interviews_scheduled_by_idx" ON "interviews"("scheduled_by");

-- CreateIndex
CREATE INDEX "interviews_start_at_idx" ON "interviews"("start_at");

-- CreateIndex
CREATE INDEX "interviews_status_idx" ON "interviews"("status");

-- AddForeignKey
ALTER TABLE "ai_resume_results" ADD CONSTRAINT "fk_ai_resume_results_resume" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_stage_histories" ADD CONSTRAINT "fk_stage_history_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_stage_histories" ADD CONSTRAINT "fk_stage_history_from_stage" FOREIGN KEY ("from_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_stage_histories" ADD CONSTRAINT "fk_stage_history_to_stage" FOREIGN KEY ("to_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_stage_histories" ADD CONSTRAINT "fk_stage_history_user" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_hr" FOREIGN KEY ("assigned_hr_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_resume" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_stage" FOREIGN KEY ("current_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "fk_candidate_skills_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "fk_candidate_skills_skill" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "fk_job_skills_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "fk_job_skills_skill" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "fk_jobs_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "fk_pipeline_stages_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "fk_resumes_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_certificates" ADD CONSTRAINT "fk_candidate_certificates_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_educations" ADD CONSTRAINT "fk_candidate_educations_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_experiences" ADD CONSTRAINT "fk_candidate_experiences_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_languages" ADD CONSTRAINT "fk_candidate_languages_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_imports" ADD CONSTRAINT "fk_candidate_imports_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_imports" ADD CONSTRAINT "fk_candidate_imports_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_imports" ADD CONSTRAINT "fk_candidate_imports_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_imports" ADD CONSTRAINT "fk_candidate_imports_user" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_leads" ADD CONSTRAINT "fk_candidate_leads_application" FOREIGN KEY ("converted_application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_leads" ADD CONSTRAINT "fk_candidate_leads_candidate" FOREIGN KEY ("converted_candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_leads" ADD CONSTRAINT "fk_candidate_leads_job" FOREIGN KEY ("target_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_leads" ADD CONSTRAINT "fk_candidate_leads_reviewer" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "google_accounts" ADD CONSTRAINT "fk_google_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "fk_interviews_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "fk_interviews_scheduled_by" FOREIGN KEY ("scheduled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
