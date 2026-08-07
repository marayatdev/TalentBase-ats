import { candidate_skills_proficiency } from "@/generated/prisma/client";
import { ResumeSkill } from "@/types/ai-resume.type";

export const mapSkillProficiency = (
  proficiency: ResumeSkill["proficiency"],
): candidate_skills_proficiency | undefined => {
  if (!proficiency) {
    return undefined;
  }

  const mapping: Record<
    Exclude<ResumeSkill["proficiency"], null>,
    candidate_skills_proficiency
  > = {
    beginner: candidate_skills_proficiency.beginner,
    intermediate: candidate_skills_proficiency.intermediate,
    advanced: candidate_skills_proficiency.advanced,
    expert: candidate_skills_proficiency.expert,
  };

  return mapping[proficiency];
};
