export interface ResumeExperience {
  company: string;
  position: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface ResumeEducation {
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
}

export interface ResumeSkill {
  name: string;
  experience_years: number | null;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert" | null;
}

export interface ResumeLanguage {
  name: string;
  level: string | null;
}

export interface ParsedResumeData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  current_position: string | null;
  total_experience_years: number;
  summary: string;
  skills: ResumeSkill[];
  experiences: ResumeExperience[];
  educations: ResumeEducation[];
  languages: ResumeLanguage[];
}

export interface ParseResumeResult {
  resume_id: bigint;
  candidate_id: bigint;
  parsed_data: ParsedResumeData;
}

export interface ResumeCertificate {
  name: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
}

export interface ParsedResumeData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  current_position: string | null;
  total_experience_years: number;
  summary: string;
  skills: ResumeSkill[];
  experiences: ResumeExperience[];
  educations: ResumeEducation[];
  languages: ResumeLanguage[];
  certificates: ResumeCertificate[];
}
