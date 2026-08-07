import { prisma } from "@/config/db";
import { gemini, geminiModel } from "@/config/gemini";

import type {
  AnalyzeCandidatePostDto,
  CandidatePostAnalysis,
} from "@/types/candidate-import.type";

import { AppError } from "@/utils/app-error";

const responseSchema = {
  type: "object",

  properties: {
    is_job_seeker: {
      type: "boolean",
    },

    matches_target_position: {
      type: "boolean",
    },

    detected_position: {
      type: ["string", "null"],
    },

    target_position: {
      type: "string",
    },

    confidence: {
      type: "number",
    },

    reason: {
      type: "string",
    },

    full_name: {
      type: ["string", "null"],
    },

    email: {
      type: ["string", "null"],
    },

    phone: {
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
    "is_job_seeker",
    "matches_target_position",
    "detected_position",
    "target_position",
    "confidence",
    "reason",
    "full_name",
    "email",
    "phone",
    "skills",
  ],
} as const;

export class CandidatePostAnalyzerService {
  async analyze(
    data: AnalyzeCandidatePostDto,
  ): Promise<CandidatePostAnalysis> {
    const rawText =
      data.raw_text?.trim();

    if (!rawText) {
      throw new AppError(
        "กรุณาระบุข้อความโพสต์",
        400,
      );
    }

    if (rawText.length < 20) {
      throw new AppError(
        "ข้อความโพสต์สั้นเกินไปสำหรับการวิเคราะห์",
        400,
      );
    }

    /*
     * ใช้ Job จากฐานข้อมูลเป็นแหล่งข้อมูลหลัก
     * ไม่เชื่อ description หรือ requirements
     * ที่ Extension ส่งมาโดยตรง
     */
    const jobId =
      this.parseJobId(data.job_id);

    const job =
      await prisma.jobs.findUnique({
        where: {
          id: jobId,
        },

        select: {
          id: true,
          title: true,
          description: true,
          requirements: true,
          minimum_experience_years: true,
          employment_type: true,
          status: true,
        },
      });

    if (!job) {
      throw new AppError(
        "ไม่พบตำแหน่งงาน",
        404,
      );
    }

    if (job.status === "closed") {
      throw new AppError(
        "ตำแหน่งงานนี้ปิดรับสมัครแล้ว",
        409,
      );
    }

    const targetPosition =
      job.title.trim();

    const description =
      job.description?.trim() ||
      "ไม่ระบุรายละเอียดงาน";

    const requirements =
      job.requirements?.trim() ||
      "ไม่ระบุคุณสมบัติที่ต้องการ";

    const minimumExperienceYears =
      Number(
        job.minimum_experience_years ??
          0,
      );

    const employmentType =
      this.humanizeEmploymentType(
        job.employment_type,
      );

    const prompt = `
คุณเป็นระบบ AI ช่วยฝ่าย HR วิเคราะห์โพสต์ในกลุ่ม Facebook เพื่อค้นหาผู้สมัครงาน

## เป้าหมาย

1. ตรวจว่าโพสต์นี้มาจากบุคคลที่กำลังหางาน ฝากประวัติ หรือเปิดรับโอกาสทำงานหรือไม่
2. ประเมินว่าบุคคลในโพสต์เหมาะสมกับตำแหน่งงานที่กำหนดหรือไม่
3. ประเมินจากรายละเอียดงาน คุณสมบัติ ทักษะ และประสบการณ์ที่ต้องการ ไม่ใช่ดูเฉพาะชื่อตำแหน่ง

## ข้อมูลตำแหน่งงาน

Job ID:
${job.id.toString()}

ชื่อตำแหน่ง:
${targetPosition}

ประเภทการจ้างงาน:
${employmentType}

รายละเอียดงาน:
${description}

คุณสมบัติและทักษะที่ต้องการ:
${requirements}

ประสบการณ์ขั้นต่ำ:
${minimumExperienceYears} ปี

## ลำดับความสำคัญในการประเมิน

1. ทักษะและคุณสมบัติที่ระบุใน Requirements
2. ประสบการณ์ทำงานที่เกี่ยวข้อง
3. ความรับผิดชอบและลักษณะงานใน Description
4. ตำแหน่งงานหรือสายงานปัจจุบันของบุคคลในโพสต์
5. ทักษะเพิ่มเติมที่ช่วยสนับสนุนการทำงาน

## กฎการจำแนกโพสต์

- is_job_seeker = true เฉพาะเมื่อเจ้าของโพสต์กำลังหางาน ฝากประวัติ เปิดรับโอกาสทำงาน หรือเสนอความสามารถของตนเองเพื่อหางาน
- ถ้าเป็นบริษัท HR หรือ Recruiter ประกาศรับสมัครงาน ให้ is_job_seeker = false
- ถ้าเป็นโพสต์ขายคอร์ส โฆษณา ประชาสัมพันธ์ แชร์ข่าว ถามคำถามทั่วไป หรือหาคนทำงาน ให้ is_job_seeker = false
- ถ้าไม่สามารถระบุได้อย่างสมเหตุสมผลว่าเจ้าของโพสต์กำลังหางาน ให้ is_job_seeker = false

## กฎการประเมินความเหมาะสม

- matches_target_position = true เมื่อทักษะ ประสบการณ์ หรือสายงานสอดคล้องกับ Requirements และ Description อย่างมีนัยสำคัญ
- ไม่จำเป็นต้องมีชื่อตำแหน่งตรงกัน หากทักษะและประสบการณ์ตรงตามงาน
- แม้ชื่อตำแหน่งจะตรงกัน แต่ถ้าขาดทักษะสำคัญตาม Requirements อย่างชัดเจน ให้ matches_target_position = false
- หากโพสต์มีข้อมูลน้อยเกินไปจนไม่สามารถยืนยันความเหมาะสมได้ ให้ลด confidence
- หากประสบการณ์ต่ำกว่าที่กำหนด แต่ทักษะตรงบางส่วน สามารถอธิบายว่าใกล้เคียงได้ แต่ไม่ควรให้ confidence สูง
- confidence ต้องเป็นตัวเลขตั้งแต่ 0 ถึง 100
- reason ต้องอธิบายเหตุผลสั้น กระชับ และเป็นภาษาไทย
- reason ควรกล่าวถึงทักษะหรือประสบการณ์ที่ตรงและส่วนที่ยังขาด
- skills ต้องดึงเฉพาะทักษะที่ปรากฏจริงในโพสต์
- detected_position ต้องใช้เฉพาะตำแหน่งหรือสายงานที่อนุมานได้จากข้อความอย่างสมเหตุสมผล

## กฎด้านความถูกต้องและความเป็นธรรม

- ห้ามเดาชื่อ อีเมล เบอร์โทร ตำแหน่ง หรือทักษะที่ไม่มีในโพสต์
- หากไม่มีข้อมูล ให้คืนค่า null หรือ array ว่าง
- ไม่ใช้เพศ อายุ ศาสนา เชื้อชาติ สัญชาติ ความพิการ หรือสถานภาพสมรสในการตัดสิน
- ตอบเป็น JSON ตาม Schema ที่กำหนดเท่านั้น

## แหล่งข้อมูล

Source:
${data.source}

URL:
${data.source_url ?? "ไม่พบ URL"}

## ข้อความโพสต์ Facebook

--- POST START ---
${rawText.slice(0, 20_000)}
--- POST END ---
    `.trim();

    try {
      const response =
        await gemini.models.generateContent({
          model: geminiModel,

          contents: prompt,

          config: {
            responseMimeType:
              "application/json",

            responseSchema,
          },
        });

      if (!response.text) {
        throw new AppError(
          "AI ไม่สามารถวิเคราะห์โพสต์ได้",
          502,
        );
      }

      let result: CandidatePostAnalysis;

      try {
        result =
          JSON.parse(
            response.text,
          ) as CandidatePostAnalysis;
      } catch {
        throw new AppError(
          "รูปแบบผลลัพธ์จาก AI ไม่ถูกต้อง",
          502,
        );
      }

      return {
        is_job_seeker:
          Boolean(
            result.is_job_seeker,
          ),

        matches_target_position:
          Boolean(
            result.matches_target_position,
          ),

        detected_position:
          this.normalizeNullableString(
            result.detected_position,
          ),

        /*
         * บังคับใช้ชื่อจาก Job ในฐานข้อมูล
         * ไม่ใช้ค่าที่ AI คืนมา
         */
        target_position:
          targetPosition,

        confidence:
          this.normalizeConfidence(
            result.confidence,
          ),

        reason:
          this.normalizeNullableString(
            result.reason,
          ) ??
          "AI ไม่ได้ระบุเหตุผล",

        full_name:
          this.normalizeNullableString(
            result.full_name,
          ),

        email:
          this.normalizeEmail(
            result.email,
          ),

        phone:
          this.normalizePhone(
            result.phone,
          ),

        skills:
          this.uniqueStrings(
            result.skills ?? [],
          ),

        source:
          data.source,

        source_url:
          this.normalizeNullableString(
            data.source_url ?? null,
          ),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const err =
        error as Error & {
          cause?: unknown;
        };

      const causeMessage =
        err.cause instanceof Error
          ? err.cause.message
          : typeof err.cause ===
              "string"
            ? err.cause
            : "";

      const message =
        causeMessage ||
        err.message ||
        "Unknown Gemini error";

      console.error(
        "[CandidatePostAnalyzerService] Gemini error:",
        {
          name:
            err.name,

          message:
            err.message,

          cause:
            err.cause,

          jobId:
            job.id.toString(),

          jobTitle:
            job.title,
        },
      );

      throw new AppError(
        `วิเคราะห์โพสต์ไม่สำเร็จ: ${message}`,
        this.getStatusCode(
          message,
        ),
      );
    }
  }

  private parseJobId(
    value:
      | string
      | number
      | bigint
      | undefined
      | null,
  ): bigint {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      throw new AppError(
        "กรุณาระบุตำแหน่งงานที่ต้องการค้นหา",
        400,
      );
    }

    const normalized =
      String(value).trim();

    if (!/^[1-9]\d*$/.test(normalized)) {
      throw new AppError(
        "รหัสตำแหน่งงานไม่ถูกต้อง",
        400,
      );
    }

    return BigInt(
      normalized,
    );
  }

  private humanizeEmploymentType(
    value: string,
  ): string {
    const map: Record<
      string,
      string
    > = {
      full_time:
        "Full time",

      part_time:
        "Part time",

      contract:
        "Contract",

      internship:
        "Internship",
    };

    return (
      map[value] ??
      value.replace(
        /_/g,
        " ",
      )
    );
  }

  private normalizeConfidence(
    value: number,
  ): number {
    const confidence =
      Number(value);

    if (
      !Number.isFinite(
        confidence,
      )
    ) {
      return 0;
    }

    return Math.min(
      Math.max(
        Math.round(
          confidence,
        ),
        0,
      ),
      100,
    );
  }

  private normalizeNullableString(
    value:
      | string
      | null
      | undefined,
  ): string | null {
    if (
      typeof value !== "string"
    ) {
      return null;
    }

    const normalized =
      value.trim();

    return normalized ||
      null;
  }

  private normalizeEmail(
    value:
      | string
      | null
      | undefined,
  ): string | null {
    if (
      typeof value !== "string"
    ) {
      return null;
    }

    const normalized =
      value
        .trim()
        .toLowerCase();

    if (!normalized) {
      return null;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized,
    )
      ? normalized
      : null;
  }

  private normalizePhone(
    value:
      | string
      | null
      | undefined,
  ): string | null {
    if (
      typeof value !== "string"
    ) {
      return null;
    }

    const normalized =
      value.replace(
        /[\s()-]/g,
        "",
      );

    if (!normalized) {
      return null;
    }

    if (
      normalized.startsWith(
        "+66",
      )
    ) {
      return `0${normalized.slice(
        3,
      )}`;
    }

    return normalized;
  }

  private uniqueStrings(
    values: string[],
  ): string[] {
    const map =
      new Map<
        string,
        string
      >();

    for (
      const value
      of values
    ) {
      if (
        typeof value !==
        "string"
      ) {
        continue;
      }

      const normalized =
        value.trim();

      if (!normalized) {
        continue;
      }

      const key =
        normalized.toLowerCase();

      if (!map.has(key)) {
        map.set(
          key,
          normalized,
        );
      }
    }

    return [
      ...map.values(),
    ];
  }

  private getStatusCode(
    message: string,
  ): number {
    const normalized =
      message.toUpperCase();

    if (
      normalized.includes(
        '"CODE":503',
      ) ||
      normalized.includes(
        "UNAVAILABLE",
      ) ||
      normalized.includes(
        "HIGH DEMAND",
      ) ||
      normalized.includes(
        "FETCH FAILED",
      )
    ) {
      return 503;
    }

    if (
      normalized.includes(
        '"CODE":429',
      ) ||
      normalized.includes(
        "RESOURCE_EXHAUSTED",
      ) ||
      normalized.includes(
        "RATE LIMIT",
      )
    ) {
      return 429;
    }

    if (
      normalized.includes(
        "TIMEOUT",
      ) ||
      normalized.includes(
        "TIMED OUT",
      )
    ) {
      return 504;
    }

    return 502;
  }
}