import { gemini, geminiModel } from "@/config/gemini";
import {
  ParsedCandidateText,
  ParseCandidateTextDto,
} from "@/types/candidate-import.type";
import { AppError } from "@/utils/app-error";

const candidateTextResponseSchema = {
  type: "object",

  properties: {
    full_name: {
      type: ["string", "null"],
    },

    email: {
      type: ["string", "null"],
    },

    phone: {
      type: ["string", "null"],
    },

    current_position: {
      type: ["string", "null"],
    },

    target_position: {
      type: ["string", "null"],
    },

    summary: {
      type: ["string", "null"],
    },

    skills: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },

  required: [
    "full_name",
    "email",
    "phone",
    "current_position",
    "target_position",
    "summary",
    "skills",
  ],
};

interface RegexCandidateData {
  email: string | null;
  phone: string | null;
}

export class CandidateImportParserService {
  async parseText(data: ParseCandidateTextDto): Promise<ParsedCandidateText> {
    const rawText = data.raw_text?.trim();

    if (!rawText) {
      throw new AppError("กรุณาเลือกหรือกรอกข้อความผู้สมัคร", 400);
    }

    if (rawText.length < 10) {
      throw new AppError("ข้อความสั้นเกินไปสำหรับการวิเคราะห์", 400);
    }

    const regexData = this.extractWithRegex(rawText);

    const prompt = `
คุณเป็นระบบช่วย HR แยกข้อมูลผู้สมัครจากข้อความโพสต์ใน LinkedIn หรือ Facebook

กฎสำคัญ:
- ดึงเฉพาะข้อมูลที่ปรากฏจริงในข้อความ
- ห้ามเดาชื่อ อีเมล เบอร์โทร หรือตำแหน่ง
- ชื่อบัญชีหรือชื่อเพจอาจไม่ใช่ชื่อจริง หากไม่มั่นใจให้ full_name เป็น null
- current_position หมายถึงตำแหน่งงานปัจจุบันหรือตำแหน่งล่าสุดที่เคยทำ
- target_position หมายถึงตำแหน่งที่ผู้สมัครกำลังมองหา
- ถ้าโพสต์ระบุเพียง "หางาน Full Stack Developer" ให้ใส่ target_position แต่ไม่ต้องใส่ current_position
- ถ้าไม่พบข้อมูลประเภท string ให้ใช้ null
- ถ้าไม่พบทักษะให้ใช้ []
- skills ต้องตัดรายการซ้ำและใช้ชื่อมาตรฐาน
- summary เขียนเป็นภาษาไทยแบบกระชับ 1-3 ประโยค
- ห้ามใช้อายุ เพศ ศาสนา เชื้อชาติ หรือสถานภาพสมรสในการวิเคราะห์

แหล่งข้อมูล:
${data.source ?? "manual"}

ข้อมูลที่ Regex ตรวจพบ:
${JSON.stringify(regexData, null, 2)}

ข้อความโพสต์:

--- TEXT START ---
${rawText.slice(0, 30_000)}
--- TEXT END ---
    `.trim();

    try {
      const response = await gemini.models.generateContent({
        model: geminiModel,
        contents: prompt,

        config: {
          responseMimeType: "application/json",

          responseSchema: candidateTextResponseSchema,
        },
      });

      if (!response.text) {
        throw new AppError("AI ไม่สามารถแยกข้อมูลผู้สมัครได้", 502);
      }

      const aiResult = JSON.parse(response.text) as ParsedCandidateText;

      return this.normalizeResult(aiResult, regexData);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Unknown Gemini error";

      throw new AppError(
        `วิเคราะห์ข้อความผู้สมัครไม่สำเร็จ: ${message}`,
        this.getStatusCode(message),
      );
    }
  }

  private extractWithRegex(rawText: string): RegexCandidateData {
    const emailMatch = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

    const phoneMatches = rawText.match(/(?:\+66|0)[0-9\s()-]{8,14}/g);

    const phone = phoneMatches?.[0]
      ? this.normalizePhone(phoneMatches[0])
      : null;

    return {
      email: emailMatch?.[0]?.toLowerCase() ?? null,
      phone,
    };
  }

  private normalizeResult(
    result: ParsedCandidateText,
    regexData: RegexCandidateData,
  ): ParsedCandidateText {
    return {
      full_name: this.normalizeNullableString(result.full_name),

      email: regexData.email ?? this.normalizeEmail(result.email),

      phone: regexData.phone ?? this.normalizePhone(result.phone),

      current_position: this.normalizeNullableString(result.current_position),

      target_position: this.normalizeNullableString(result.target_position),

      summary: this.normalizeNullableString(result.summary),

      skills: this.uniqueStrings(result.skills ?? []),
    };
  }

  private uniqueStrings(values: string[]): string[] {
    const uniqueValues = new Map<string, string>();

    for (const value of values) {
      const normalizedValue = value.trim();

      if (!normalizedValue) {
        continue;
      }

      const key = normalizedValue.toLowerCase();

      if (!uniqueValues.has(key)) {
        uniqueValues.set(key, normalizedValue);
      }
    }

    return Array.from(uniqueValues.values());
  }

  private normalizeEmail(value: string | null): string | null {
    const normalized = value?.trim().toLowerCase();

    return normalized || null;
  }

  private normalizePhone(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.replace(/[\s()-]/g, "");

    if (normalized.startsWith("+66")) {
      return `0${normalized.slice(3)}`;
    }

    return normalized || null;
  }

  private normalizeNullableString(value: string | null): string | null {
    const normalized = value?.trim();

    return normalized || null;
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
