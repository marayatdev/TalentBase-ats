import { prisma } from "@/config/db";
import { gemini, geminiModel } from "@/config/gemini";

import { AppError } from "@/utils/app-error";

const responseSchema = {
    type: "object",

    properties: {
        queries: {
            type: "array",
            items: {
                type: "string",
            },
        },
    },

    required: [
        "queries",
    ],
} as const;

interface GenerateSearchQueriesResult {
    job_id: string;
    job_title: string;
    queries: string[];
}

export class CandidateSearchQueryService {
    async generate(
        jobId: string,
    ): Promise<GenerateSearchQueriesResult> {
        const parsedJobId =
            this.parseJobId(jobId);

        const job =
            await prisma.jobs.findUnique({
                where: {
                    id: parsedJobId,
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

        const title =
            job.title.trim();

        const description =
            job.description?.trim() ||
            "ไม่ระบุ";

        const requirements =
            job.requirements?.trim() ||
            "ไม่ระบุ";

        const minimumExperience =
            Number(
                job.minimum_experience_years ??
                0,
            );

        const prompt = `
คุณเป็น AI ช่วยฝ่าย HR สร้างคำค้นสำหรับค้นหาผู้สมัครงานจาก Social Media และ Job Communities

เป้าหมาย:
สร้าง search query ที่ใช้ค้นหา "คนที่กำลังหางาน" หรือ "เปิดรับโอกาสทำงาน"
สำหรับตำแหน่งงานที่กำหนด

ข้อมูลตำแหน่งงาน:

ชื่อตำแหน่ง:
${title}

รายละเอียดงาน:
${description}

คุณสมบัติที่ต้องการ:
${requirements}

ประสบการณ์ขั้นต่ำ:
${minimumExperience} ปี

ประเภทการจ้างงาน:
${job.employment_type}

กฎสำคัญ:

- สร้าง 6 ถึง 8 search queries
- แต่ละ query ต้องสั้นและใช้ค้นหาได้จริง
- ใช้ทั้งภาษาไทยและภาษาอังกฤษอย่างเหมาะสม
- เน้น keyword ที่ Candidate มีแนวโน้มใช้ในโพสต์หางาน
- ใช้คำ เช่น:
  - หางาน
  - พร้อมเริ่มงาน
  - open to work
  - looking for job
  - looking for opportunity
  - available
- ใช้ Job Title และ Skills สำคัญจาก Requirements
- ไม่ต้องใส่ skill ทุกตัวใน query เดียว
- กระจาย skill สำคัญไปหลาย query
- หลีกเลี่ยง query ที่ยาวเกินไป
- ห้ามสร้าง query ที่เน้นประกาศรับสมัครงานจากบริษัท
- เป้าหมายคือค้นหา Candidate ไม่ใช่ Job Posting

ตัวอย่างแนวคิด:

"Backend Developer Node.js TypeScript หางาน"
"Node.js PostgreSQL open to work"
"Backend Engineer Docker AWS looking for opportunity"
"Software Engineer พร้อมเริ่มงาน TypeScript"

ตอบเป็น JSON ตาม Schema เท่านั้น
    `.trim();

        try {
            const response =
                await gemini.models.generateContent({
                    model:
                        geminiModel,

                    contents:
                        prompt,

                    config: {
                        responseMimeType:
                            "application/json",

                        responseSchema,
                    },
                });

            if (!response.text) {
                throw new AppError(
                    "AI ไม่สามารถสร้างคำค้นได้",
                    502,
                );
            }

            let parsed: {
                queries?: string[];
            };

            try {
                parsed =
                    JSON.parse(
                        response.text,
                    ) as {
                        queries?: string[];
                    };
            } catch {
                throw new AppError(
                    "รูปแบบผลลัพธ์จาก AI ไม่ถูกต้อง",
                    502,
                );
            }

            const queries =
                this.normalizeQueries(
                    parsed.queries ??
                    [],
                );

            if (
                queries.length ===
                0
            ) {
                throw new AppError(
                    "AI ไม่สามารถสร้างคำค้นที่ใช้งานได้",
                    502,
                );
            }

            return {
                job_id:
                    job.id.toString(),

                job_title:
                    title,

                queries,
            };
        } catch (error) {
            if (
                error instanceof
                AppError
            ) {
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
                "Unknown AI error";

            console.error(
                "[CandidateSearchQueryService] Generate search queries failed",
                {
                    jobId:
                        job.id.toString(),

                    jobTitle:
                        job.title,

                    error,
                },
            );

            throw new AppError(
                `สร้างคำค้นไม่สำเร็จ: ${message}`,
                this.getStatusCode(
                    message,
                ),
            );
        }
    }

    private parseJobId(
        value: string,
    ): bigint {
        const normalized =
            value?.trim();

        if (
            !normalized ||
            !/^[1-9]\d*$/.test(
                normalized,
            )
        ) {
            throw new AppError(
                "รหัสตำแหน่งงานไม่ถูกต้อง",
                400,
            );
        }

        return BigInt(
            normalized,
        );
    }

    private normalizeQueries(
        values: string[],
    ): string[] {
        const result =
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
                value
                    .replace(
                        /\s+/g,
                        " ",
                    )
                    .trim();

            if (
                normalized.length <
                3
            ) {
                continue;
            }

            const key =
                normalized.toLowerCase();

            if (
                !result.has(
                    key,
                )
            ) {
                result.set(
                    key,
                    normalized,
                );
            }
        }

        return [
            ...result.values(),
        ].slice(
            0,
            8,
        );
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

        return 502;
    }
}