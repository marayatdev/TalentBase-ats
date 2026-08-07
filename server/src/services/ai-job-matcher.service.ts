import { gemini, geminiModel } from "@/config/gemini";
import { AIJobMatchResult } from "@/types/ai-job-match.type";
import { AppError } from "@/utils/app-error";

const jobMatchResponseSchema = {
  type: "object",

  properties: {
    overall_score: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },

    skill_score: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },

    experience_score: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },

    education_score: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },

    language_score: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },

    recommendation: {
      type: "string",
      enum: [
        "strong_match",
        "potential_match",
        "weak_match",
        "not_recommended",
      ],
    },

    matched_skills: {
      type: "array",
      items: {
        type: "string",
      },
    },

    missing_required_skills: {
      type: "array",
      items: {
        type: "string",
      },
    },

    additional_skills: {
      type: "array",
      items: {
        type: "string",
      },
    },

    strengths: {
      type: "array",
      items: {
        type: "string",
      },
    },

    concerns: {
      type: "array",
      items: {
        type: "string",
      },
    },

    skill_details: {
      type: "array",

      items: {
        type: "object",

        properties: {
          name: {
            type: "string",
          },

          importance: {
            type: "string",
            enum: ["required", "preferred"],
          },

          matched: {
            type: "boolean",
          },

          candidate_evidence: {
            type: ["string", "null"],
          },
        },

        required: ["name", "importance", "matched", "candidate_evidence"],
      },
    },

    summary: {
      type: "string",
    },

    interview_questions: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },

  required: [
    "overall_score",
    "skill_score",
    "experience_score",
    "education_score",
    "language_score",
    "recommendation",
    "matched_skills",
    "missing_required_skills",
    "additional_skills",
    "strengths",
    "concerns",
    "skill_details",
    "summary",
    "interview_questions",
  ],
};

interface MatchInput {
  job: {
    title: string;
    description: string | null;
    requirements: string | null;
    employment_type: string;
    minimum_experience_years: number;
    skills: Array<{
      name: string;
      is_required: boolean;
      weight: number;
    }>;
  };

  candidate: {
    full_name: string;
    current_position: string | null;
    total_experience_years: number;
    skills: Array<{
      name: string;
      experience_years: number | null;
      proficiency: string | null;
    }>;
    experiences: unknown[];
    educations: unknown[];
    languages: unknown[];
    certificates: unknown[];
    resume_summary: string | null;
  };
}

export class AIJobMatcherService {
  async match(input: MatchInput): Promise<AIJobMatchResult> {
    const prompt = `
คุณเป็นระบบช่วย HR เปรียบเทียบผู้สมัครกับตำแหน่งงาน

ให้ประเมินจากข้อมูลต่อไปนี้เท่านั้น:
- ประสบการณ์ทำงาน
- ทักษะ
- การศึกษา
- ภาษา
- Certificate
- Job Description และ Requirements

ห้ามประเมินจาก:
- อายุ
- เพศ
- ศาสนา
- เชื้อชาติ
- รูปภาพ
- สถานภาพสมรส
- ชื่อหรือข้อมูลส่วนบุคคลที่ไม่เกี่ยวข้องกับงาน

หลักการให้คะแนน:
- overall_score ต้องอยู่ระหว่าง 0 ถึง 100
- ทักษะ required มีน้ำหนักสูงกว่าทักษะ preferred
- ห้ามถือว่าผู้สมัครมีทักษะ หากไม่มีหลักฐานใน Resume
- ถ้า Job ไม่ได้กำหนดการศึกษาหรือภาษา ให้ใช้คะแนนส่วนนั้นเป็น 100
- ห้ามตัดสินรับหรือปฏิเสธผู้สมัครแทน HR
- summary เขียนภาษาไทย 3-5 ประโยค
- interview_questions สร้าง 3-5 คำถามจากจุดที่ต้องตรวจสอบเพิ่มเติม

ข้อมูลตำแหน่งงาน:
${JSON.stringify(input.job, null, 2)}

ข้อมูลผู้สมัคร:
${JSON.stringify(input.candidate, null, 2)}
    `.trim();

    try {
      const response = await gemini.models.generateContent({
        model: geminiModel,
        contents: prompt,

        config: {
          responseMimeType: "application/json",

          responseSchema: jobMatchResponseSchema,
        },
      });

      if (!response.text) {
        throw new AppError("Gemini ไม่สามารถวิเคราะห์ความเหมาะสมได้", 502);
      }

      const result = JSON.parse(response.text) as AIJobMatchResult;

      return this.normalizeResult(result);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Unknown Gemini error";

      throw new AppError(
        `Gemini วิเคราะห์ความเหมาะสมไม่สำเร็จ: ${message}`,
        this.getStatusCode(message),
      );
    }
  }

  private normalizeResult(result: AIJobMatchResult): AIJobMatchResult {
    return {
      ...result,

      overall_score: this.normalizeScore(result.overall_score),

      skill_score: this.normalizeScore(result.skill_score),

      experience_score: this.normalizeScore(result.experience_score),

      education_score: this.normalizeScore(result.education_score),

      language_score: this.normalizeScore(result.language_score),

      matched_skills: this.uniqueStrings(result.matched_skills),

      missing_required_skills: this.uniqueStrings(
        result.missing_required_skills,
      ),

      additional_skills: this.uniqueStrings(result.additional_skills),

      strengths: this.uniqueStrings(result.strengths),

      concerns: this.uniqueStrings(result.concerns),

      interview_questions: this.uniqueStrings(result.interview_questions),

      summary: result.summary.trim(),
    };
  }

  private normalizeScore(score: number): number {
    if (!Number.isFinite(score)) {
      return 0;
    }

    return Math.min(Math.max(Number(score.toFixed(2)), 0), 100);
  }

  private uniqueStrings(values: string[]): string[] {
    const map = new Map<string, string>();

    for (const value of values ?? []) {
      const normalized = value.trim();

      if (!normalized) {
        continue;
      }

      const key = normalized.toLowerCase();

      if (!map.has(key)) {
        map.set(key, normalized);
      }
    }

    return Array.from(map.values());
  }

  private getStatusCode(message: string): number {
    if (
      message.includes('"code":503') ||
      message.includes("UNAVAILABLE") ||
      message.includes("high demand")
    ) {
      return 503;
    }

    if (
      message.includes('"code":429') ||
      message.includes("RESOURCE_EXHAUSTED")
    ) {
      return 429;
    }

    if (message.includes('"code":401') || message.includes("API_KEY_INVALID")) {
      return 401;
    }

    return 502;
  }
}
