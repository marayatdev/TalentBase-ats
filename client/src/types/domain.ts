// All BIGINT ids come back from the API as strings.
export type Id = string;

export type UserRole = "admin" | "hr" | "interviewer";

export interface AIJobMatchSkillDetail {
  name: string;

  importance:
    | "required"
    | "optional";

  matched: boolean;

  candidate_evidence:
    | string
    | null;
}

export interface User {
  id: Id;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
}

export type MatchRecommendation =
  | "strong_match"
  | "potential_match"
  | "weak_match"
  | "not_recommended";

export interface SkillDetailRow {
  skill: string;
  required: boolean;
  candidate_has: boolean;
  proficiency?: string | null;
}

export interface AIJobMatch {
  id: string;
  application_id: string;

  overall_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  language_score: number;

  recommendation: MatchRecommendation;
  summary: string;

  matched_skills: string[];
  missing_required_skills: string[];
  additional_skills: string[];

  strengths: string[];
  concerns: string[];

  skill_details: AIJobMatchSkillDetail[];

  interview_questions: string[];

  created_at: string;
}
export interface Candidate {
  id: Id;
  full_name: string;
  email: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  current_position?: string | null;
  total_experience_years?: number | null;
  source: CandidateSource;
  source_url?: string | null;

  skills?: Skill[];
  work_experiences?: WorkExperience[];
  education?: Education[];
  languages?: Language[];
  certificates?: Certificate[];

  resumes?: Resume[];

  resume_count?: number;
  application_count?: number;
  skills_count?: number;

  created_at: string;
  updated_at?: string;
}

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship";

export type JobStatus = "draft" | "open" | "closed";

export interface Job {
  id: Id;
  title: string;
  description: string;
  requirements: string;

  employment_type: EmploymentType;

  minimum_experience_years: number;
  salary_min: number | null;
  salary_max: number | null;
  number_of_positions: number;

  status: JobStatus;

  created_by: Id | null;

  created_by_user: {
    id: Id;
    name: string;
    email: string;
  } | null;

  applicant_count: number;

  created_at: string;
  updated_at: string;
}

export type StageType = "active" | "hired" | "rejected";

export interface PipelineStage {
  id: Id;
  job_id: Id;
  name: string;
  stage_order: number;
  stage_type: StageType;

  candidate_count?: number;
  application_count?: number;

  created_at?: string;
}

export type CandidateSource =
  | "manual"
  | "website"
  | "email"
  | "linkedin"
  | "facebook"
  | "referral";

export interface CreateCandidateWithResumeResult {
  candidate: Candidate;
  resume: Resume | null;
  application: Application | null;
}
export interface Skill {
  id?: Id;
  name: string;
  level?: string | null;
}

export interface WorkExperience {
  id?: Id;
  company: string;
  position: string;
  start_date: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
}

export interface Education {
  id?: Id;
  institution: string;
  degree: string | null;
  field_of_study?: string | null;
  start_year?: number | null;
  end_year?: number | null;
}

export interface Language {
  id?: Id;
  name: string;
  proficiency?: string | null;
}

export interface Certificate {
  id?: Id;
  name: string;
  issuer?: string | null;
  issue_date?: string | null;
}

export interface Candidate {
  id: Id;
  full_name: string;
  email: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  current_position?: string | null;
  total_experience_years?: number | null;
  source: CandidateSource;
  source_url?: string | null;

  skills?: Skill[];
  work_experiences?: WorkExperience[];
  education?: Education[];
  languages?: Language[];
  certificates?: Certificate[];

  resume_count?: number;
  application_count?: number;
  skills_count?: number;

  created_at: string;
  updated_at?: string;
}

export type ParseStatus = "pending" | "processing" | "completed" | "failed";

export interface Resume {
  id: Id;
  candidate_id: Id;

  // Backend ใช้ original_file_name
  original_file_name: string;

  file_size: number | null;
  file_url: string;
  mime_type?: string | null;
  parse_status: ParseStatus;
  uploaded_at: string;
}

export type ApplicationStatus = "active" | "hired" | "rejected" | "withdrawn";

export interface Application {
  id: Id;

  candidate: {
    id: Id;
    full_name: string;
    email: string | null;
    phone?: string | null;
    current_position: string | null;
    source: CandidateSource;
  };

  job: {
    id: Id;
    title: string;
    status?: JobStatus;
  };

  resume: {
    id: Id;
    original_file_name: string;
    file_url: string;
    parse_status: ParseStatus;
  } | null;

  resume_id: Id | null;

  current_stage: {
    id: Id;
    name: string;
    stage_order?: number;
    stage_type: StageType;
  } | null;

  assigned_hr: {
    id: Id;
    name: string;
    email?: string;
  } | null;

  status: ApplicationStatus;

  ai_match_score: number | null;
  ai_match_summary: string | null;

  resume_parse_status: ParseStatus | null;

  // Backend ใช้ applied_at
  applied_at: string;
  updated_at: string;
}

export type ImportSource = "linkedin" | "facebook" | "manual";

export type ImportStatus = "pending" | "completed" | "failed" | "duplicate";

export interface ParsedCandidateText {
  full_name: string | null;
  email: string | null;
  phone: string | null;

  current_position: string | null;
  target_position: string | null;

  summary: string | null;
  skills: string[];
}

export interface CandidateImportResult {
  candidate_id: Id;
  application_id: Id;
  import_id: Id;
  is_duplicate: boolean;
}

export interface CandidateImport {
  id: Id;

  candidate_id: Id | null;
  application_id: Id | null;
  job_id: Id | null;

  source: ImportSource;
  source_url: string | null;
  raw_text?: string | null;

  import_status: ImportStatus;
  error_message: string | null;

  candidate?: {
    id: Id;
    full_name: string;
    email: string | null;
  } | null;

  job?: {
    id: Id;
    title: string;
  } | null;

  application?: {
    id: Id;
    status: ApplicationStatus;
  } | null;

  imported_by?: {
    id: Id;
    name: string;
    email: string;
  } | null;

  created_at: string;
  updated_at: string;
}

export type CandidateLeadSource = "facebook" | "linkedin" | "manual";

export type CandidateLeadStatus =
  | "new"
  | "reviewing"
  | "approved"
  | "rejected"
  | "duplicate"
  | "converted";

export interface CandidateLead {
  id: Id;

  source: CandidateLeadSource;
  source_url: string | null;
  raw_text: string;

  detected_name: string | null;
  detected_email: string | null;
  detected_phone: string | null;
  detected_position: string | null;

  skills: string[];

  ai_confidence: number | null;
  ai_reason: string | null;

  target_job_id: Id | null;

  status: CandidateLeadStatus;

  reviewed_by: Id | null;
  reviewed_at: string | null;

  converted_candidate_id: Id | null;
  converted_application_id: Id | null;

  created_at: string;
  updated_at: string;

  job: {
    id: Id;
    title: string;
    status?: JobStatus;
  } | null;

  reviewer: {
    id: Id;
    name: string;
    email: string;
  } | null;

  converted_candidate: {
    id: Id;
    full_name: string;
  } | null;

  converted_application: {
    id: Id;
    status: ApplicationStatus;
  } | null;
}

export type InterviewStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

export interface Interview {
  id: Id;
  application_id: Id;
  scheduled_by: Id;

  title: string;
  description: string | null;

  start_at: string;
  end_at: string;
  timezone: string;

  status: InterviewStatus;

  candidate_email: string;
  interviewer_emails: string[];

  google_calendar_id: string | null;
  google_event_id: string | null;
  google_event_url: string | null;
  meet_url: string | null;

  created_at: string;
  updated_at: string;

  users?: {
    id: Id;
    name: string;
    email: string;
  };

  applications?: {
    id: Id;
    status: ApplicationStatus;
    candidate?: {
      id: Id;
      full_name: string;
      email: string | null;
    };
    job?: {
      id: Id;
      title: string;
    };
  };
}


export interface AIResumeSkill {
  name: string;
  proficiency?: string | null;
  experience_years?: number | null;
}

export interface AIResumeWorkExperience {
  position: string;
  company: string;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
}

export interface AIResumeEducation {
  degree: string;
  institution: string;
  field_of_study?: string | null;
  graduation_year?: number | null;
}

export interface AIResumeLanguage {
  name: string;
  proficiency?: string | null;
}

export interface AIResumeCertificate {
  name: string;
  issuer?: string | null;
  issued_at?: string | null;
}

export interface AIResumeExtractedProfile {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  current_position?: string | null;
}

export interface AIResumeResult {
  id: string;
  resume_id: string;
  candidate_id: string;

  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed";

  summary?: string | null;
  model_name?: string | null;
  processed_at?: string | null;
  error_message?: string | null;
  raw_text?: string | null;

  extracted_profile?: AIResumeExtractedProfile | null;

  skills: AIResumeSkill[];
  work_experiences: AIResumeWorkExperience[];
  education: AIResumeEducation[];
  languages: AIResumeLanguage[];
  certificates: AIResumeCertificate[];

  applications: AIResumeApplication[];
}

export interface AIResumeApplication {
  id: string;
  job_id: string;

  job: {
    id: string;
    title: string;
    status?: string;
  };
}