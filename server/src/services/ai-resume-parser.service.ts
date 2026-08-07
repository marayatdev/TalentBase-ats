import { gemini, geminiModel } from "@/config/gemini";
import { ParsedResumeData } from "@/types/ai-resume.type";
import { AppError } from "@/utils/app-error";

const resumeResponseSchema = {
  type: "object",

  properties: {
    full_name: {},
    email: {},
    phone: {},
    linkedin_url: {},
    current_position: {},
    total_experience_years: {},
    summary: {},

    skills: {},
    experiences: {},
    educations: {},
    languages: {},
    certificates: {},
  },

  required: [
    "full_name",
    "email",
    "phone",
    "linkedin_url",
    "current_position",
    "total_experience_years",
    "summary",
    "skills",
    "experiences",
    "educations",
    "languages",
    "certificates",
  ],
};

export class AIResumeParserService {
  async parseResume(resumeText: string): Promise<ParsedResumeData> {
    if (!resumeText.trim()) {
      throw new AppError("ไม่พบข้อความใน Resume", 422);
    }

    const limitedText = resumeText.slice(0, 80_000);

    const prompt = `
คุณเป็นระบบวิเคราะห์ Resume สำหรับฝ่าย HR

หน้าที่ของคุณคือแยกข้อมูล Resume ให้อยู่ในรูปแบบ JSON ตาม Schema ที่กำหนด

กฎการวิเคราะห์:
- ดึงเฉพาะข้อมูลที่มีอยู่จริงใน Resume
- ห้ามเดาหรือสร้างข้อมูลเพิ่ม
- ถ้าไม่พบข้อมูลประเภท string ให้ใช้ null
- ถ้าไม่พบรายการ ให้ใช้ []
- ถ้าไม่สามารถระบุ proficiency หรือจำนวนปีของ skill ได้ ให้ใช้ null
- ตัด skill ที่ซ้ำกัน
- ปรับชื่อเทคโนโลยีให้เป็นรูปแบบมาตรฐาน เช่น Node JS เป็น Node.js, Aws เป็น AWS, kubernetes เป็น Kubernetes
- current_position ให้ใช้ตำแหน่งงานล่าสุดที่พบ
- total_experience_years ให้คำนวณจากช่วงเวลาทำงานโดยไม่รวมช่วงเวลาที่ซ้อนกัน
- summary ให้เขียนเป็นภาษาไทยแบบกระชับ 2-4 ประโยค
- ห้ามใช้ข้อมูลอ่อนไหว เช่น อายุ เพศ ศาสนา เชื้อชาติ สถานภาพสมรส หรือรูปภาพ

กฎวันที่:
- start_date และ end_date ต้องเป็นรูปแบบ YYYY-MM เท่านั้น
- ตัวอย่าง September 2025 ให้ตอบ 2025-09
- ตัวอย่าง July 2025 ให้ตอบ 2025-07
- ถ้าพบเพียงปี ให้ตอบเป็น YYYY
- ห้ามตอบชื่อเดือน เช่น Sep 2025, September 2025 หรือ กรกฎาคม 2025
- ถ้าเป็นงานปัจจุบัน ให้ end_date เป็น null และ is_current เป็น true
- ถ้ามี end_date ระบุชัดเจน ต้องกำหนด is_current เป็น false
- is_current เป็น true เฉพาะกรณีที่ระบุ Present, Current, ปัจจุบัน หรือไม่มีวันสิ้นสุดจริง ๆ
- ตรวจสอบความสอดคล้องระหว่าง end_date และ is_current ก่อนตอบ
- ถ้าพบ Certificate หรือ Certification ให้ดึงชื่อองค์กรผู้ออก วันที่ออก วันหมดอายุ Credential ID และ URL
- ถ้าไม่พบ Certificate ให้ตอบ []

Resume:

--- RESUME START ---
${limitedText}
--- RESUME END ---
    `.trim();

    try {
      const response = await gemini.models.generateContent({
        model: geminiModel,
        contents: prompt,

        config: {
          responseMimeType: "application/json",
          responseSchema: resumeResponseSchema,
        },
      });

      const responseText = response.text;

      if (!responseText) {
        throw new AppError("Gemini ไม่สามารถวิเคราะห์ Resume ได้", 502);
      }

      const parsedData = JSON.parse(responseText) as ParsedResumeData;

      return this.normalizeParsedData(parsedData);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Unknown Gemini error";

      throw new AppError(
        `Gemini วิเคราะห์ Resume ไม่สำเร็จ: ${message}`,
        this.getGeminiStatusCode(message),
      );
    }
  }

  private normalizeParsedData(data: ParsedResumeData): ParsedResumeData {
    const skills = Array.isArray(data.skills) ? data.skills : [];

    const experiences = Array.isArray(data.experiences) ? data.experiences : [];

    const educations = Array.isArray(data.educations) ? data.educations : [];

    const languages = Array.isArray(data.languages) ? data.languages : [];

    const certificates = Array.isArray(data.certificates)
      ? data.certificates
      : [];

    return {
      full_name: this.normalizeNullableString(data.full_name),

      email: this.normalizeEmail(data.email),

      phone: this.normalizePhone(data.phone),

      linkedin_url: this.normalizeNullableString(data.linkedin_url),

      current_position: this.normalizeNullableString(data.current_position),

      total_experience_years: this.normalizeNonNegativeNumber(
        data.total_experience_years,
      ),

      summary: this.normalizeRequiredString(data.summary),

      skills: this.normalizeSkills(skills),

      experiences: experiences
        .map((experience) => {
          const company = this.normalizeRequiredString(experience?.company);

          const position = this.normalizeRequiredString(experience?.position);

          if (!company || !position) {
            return null;
          }

          const startDate = this.normalizeDate(experience?.start_date);

          const rawEndDate = this.normalizeNullableString(experience?.end_date);

          const isPresentValue =
            rawEndDate !== null && this.isPresentDate(rawEndDate);

          const endDate = isPresentValue
            ? null
            : this.normalizeDate(rawEndDate);

          const isCurrent = endDate
            ? false
            : isPresentValue || experience?.is_current === true;

          return {
            company,
            position,
            start_date: startDate,
            end_date: endDate,
            is_current: isCurrent,
            description: this.normalizeNullableString(experience?.description),
          };
        })
        .filter(
          (experience): experience is ParsedResumeData["experiences"][number] =>
            experience !== null,
        ),

      educations: educations
        .map((education) => {
          const institution = this.normalizeRequiredString(
            education?.institution,
          );

          if (!institution) {
            return null;
          }

          return {
            institution,

            degree: this.normalizeNullableString(education?.degree),

            field_of_study: this.normalizeNullableString(
              education?.field_of_study,
            ),

            start_year: this.normalizeYear(education?.start_year ?? null),

            end_year: this.normalizeYear(education?.end_year ?? null),
          };
        })
        .filter(
          (education): education is ParsedResumeData["educations"][number] =>
            education !== null,
        ),

      languages: languages
        .map((language) => {
          const name = this.normalizeRequiredString(language?.name);

          if (!name) {
            return null;
          }

          return {
            name,

            level: this.normalizeNullableString(language?.level),
          };
        })
        .filter(
          (language): language is ParsedResumeData["languages"][number] =>
            language !== null,
        ),

      certificates: certificates
        .map((certificate) => {
          const name = this.normalizeRequiredString(certificate?.name);

          if (!name) {
            return null;
          }

          return {
            name,

            issuing_organization: this.normalizeNullableString(
              certificate?.issuing_organization,
            ),

            issue_date: this.normalizeDate(certificate?.issue_date),

            expiration_date: this.normalizeDate(certificate?.expiration_date),

            credential_id: this.normalizeNullableString(
              certificate?.credential_id,
            ),

            credential_url: this.normalizeNullableString(
              certificate?.credential_url,
            ),
          };
        })
        .filter(
          (
            certificate,
          ): certificate is ParsedResumeData["certificates"][number] =>
            certificate !== null,
        ),
    };
  }

  private normalizeSkills(
    skills: ParsedResumeData["skills"],
  ): ParsedResumeData["skills"] {
    const skillMap = new Map<string, ParsedResumeData["skills"][number]>();

    for (const skill of skills) {
      const rawName = this.normalizeRequiredString(skill?.name);

      if (!rawName) {
        continue;
      }

      const normalizedName = this.normalizeSkillName(rawName);

      if (!normalizedName) {
        continue;
      }

      const key = normalizedName.toLowerCase();

      const experienceYears =
        typeof skill?.experience_years === "number"
          ? this.normalizeNonNegativeNumber(skill.experience_years)
          : null;

      const proficiency =
        skill?.proficiency === "beginner" ||
        skill?.proficiency === "intermediate" ||
        skill?.proficiency === "advanced" ||
        skill?.proficiency === "expert"
          ? skill.proficiency
          : null;

      const normalizedSkill = {
        name: normalizedName,
        experience_years: experienceYears,
        proficiency,
      };

      const existing = skillMap.get(key);

      if (!existing) {
        skillMap.set(key, normalizedSkill);
        continue;
      }

      const existingYears = existing.experience_years ?? 0;

      const incomingYears = normalizedSkill.experience_years ?? 0;

      if (incomingYears > existingYears) {
        skillMap.set(key, normalizedSkill);
      }
    }

    return Array.from(skillMap.values());
  }

  private normalizeSkillName(name: string): string {
    const trimmedName = name.trim();

    const mapping: Record<string, string> = {
      "node js": "Node.js",
      "node.js": "Node.js",
      nodejs: "Node.js",

      next: "Next.js",
      "next js": "Next.js",
      "next.js": "Next.js",

      aws: "AWS",
      azure: "Azure",

      kubernetes: "Kubernetes",
      k8s: "Kubernetes",

      mongodb: "MongoDB",
      "mongo db": "MongoDB",

      mysql: "MySQL",

      javascript: "JavaScript",
      typescript: "TypeScript",

      css3: "CSS3",
      html: "HTML",

      gitlab: "GitLab",
      nginx: "Nginx",
      docker: "Docker",
      prisma: "Prisma",
      react: "React",
      express: "Express",
      linux: "Linux",
      jenkins: "Jenkins",
      tailwind: "Tailwind CSS",
    };

    return mapping[trimmedName.toLowerCase()] ?? trimmedName;
  }

  private normalizeDate(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    if (this.isPresentDate(trimmedValue)) {
      return null;
    }

    if (/^\d{4}-\d{2}$/.test(trimmedValue)) {
      return trimmedValue;
    }

    if (/^\d{4}$/.test(trimmedValue)) {
      return trimmedValue;
    }

    const monthMap: Record<string, string> = {
      jan: "01",
      january: "01",
      feb: "02",
      february: "02",
      mar: "03",
      march: "03",
      apr: "04",
      april: "04",
      may: "05",
      jun: "06",
      june: "06",
      jul: "07",
      july: "07",
      aug: "08",
      august: "08",
      sep: "09",
      sept: "09",
      september: "09",
      oct: "10",
      october: "10",
      nov: "11",
      november: "11",
      dec: "12",
      december: "12",
    };

    const match = trimmedValue.match(/^([A-Za-z]+)\s+(\d{4})$/);

    if (match) {
      const month = monthMap[match[1].toLowerCase()];

      if (month) {
        return `${match[2]}-${month}`;
      }
    }

    return null;
  }
  private isPresentDate(value: string): boolean {
    const normalized = value.trim().toLowerCase();

    return ["present", "current", "currently", "ปัจจุบัน", "now"].includes(
      normalized,
    );
  }

  private normalizeEmail(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim().toLowerCase();

    return normalized || null;
  }

  private normalizePhone(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim().replace(/[\s()-]/g, "");

    return normalized || null;
  }

  private normalizeNonNegativeNumber(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Number(value.toFixed(1));
  }

  private normalizeYear(value: unknown): number | null {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 1900 ||
      value > 2200
    ) {
      return null;
    }

    return value;
  }

  private getGeminiStatusCode(message: string): number {
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

  private normalizeRequiredString(value: unknown, fallback = ""): string {
    if (typeof value !== "string") {
      return fallback;
    }

    return value.trim();
  }

  private normalizeNullableString(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
  }
}
