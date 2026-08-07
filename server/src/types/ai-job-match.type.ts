export interface JobMatchSkill {
  name: string;
  importance: "required" | "preferred";
  matched: boolean;
  candidate_evidence: string | null;
}

export interface AIJobMatchResult {
  overall_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  language_score: number;

  recommendation:
    | "strong_match"
    | "potential_match"
    | "weak_match"
    | "not_recommended";

  matched_skills: string[];
  missing_required_skills: string[];
  additional_skills: string[];

  strengths: string[];
  concerns: string[];
  skill_details: JobMatchSkill[];

  summary: string;
  interview_questions: string[];
}
