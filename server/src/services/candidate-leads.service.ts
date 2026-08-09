import { prisma } from "@/config/db";
import {
  applications_status,
  candidate_leads_source,
  candidate_leads_status,
  candidates_source,
  Prisma,
} from "@/generated/prisma/client";
import type {
  ConvertCandidateLeadDto,
  CreateCandidateLeadDto,
  GetCandidateLeadsQuery,
  UpdateCandidateLeadDto,
} from "@/types/candidate-lead.type";
import { AppError } from "@/utils/app-error";

export class CandidateLeadService {
  async create(data: CreateCandidateLeadDto) {
    const rawText = data.raw_text?.trim();

    if (!rawText) {
      throw new AppError("กรุณาระบุข้อความโพสต์", 400);
    }

    if (rawText.length < 20) {
      throw new AppError("ข้อความโพสต์สั้นเกินไป", 400);
    }

    const sourceUrl = data.source_url?.trim() || null;

    if (sourceUrl) {
      const duplicate = await prisma.candidate_leads.findFirst({
        where: {
          source: data.source,
          source_url: sourceUrl,
          status: {
            not: candidate_leads_status.rejected,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (duplicate) {
        throw new AppError("โพสต์นี้ถูกบันทึกเข้าระบบแล้ว", 409);
      }
    }

    if (data.target_job_id) {
      const job = await prisma.jobs.findUnique({
        where: {
          id: data.target_job_id,
        },
        select: {
          id: true,
        },
      });

      if (!job) {
        throw new AppError("ไม่พบตำแหน่งงาน", 404);
      }
    }

    return prisma.candidate_leads.create({
      data: {
        source: data.source ?? candidate_leads_source.facebook,
        source_url: sourceUrl,
        raw_text: rawText,

        detected_name: data.detected_name?.trim() || null,
        detected_email: data.detected_email?.trim().toLowerCase() || null,
        detected_phone: data.detected_phone?.trim() || null,
        detected_position: data.detected_position?.trim() || null,

        skills: data.skills ?? [],

        ai_confidence:
          data.ai_confidence === undefined || data.ai_confidence === null
            ? null
            : new Prisma.Decimal(data.ai_confidence),

        ai_reason: data.ai_reason?.trim() || null,

        target_job_id: data.target_job_id ?? null,

        status: candidate_leads_status.new,
      },
    });
  }

  async findAll(query: GetCandidateLeadsQuery = {}) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.candidate_leadsWhereInput = {
      source: query.source,
      status: query.status,
      target_job_id: query.target_job_id,

      OR: query.search
        ? [
          {
            detected_name: {
              contains: query.search,
            },
          },
          {
            detected_email: {
              contains: query.search,
            },
          },
          {
            detected_phone: {
              contains: query.search,
            },
          },
          {
            detected_position: {
              contains: query.search,
            },
          },
          {
            raw_text: {
              contains: query.search,
            },
          },
        ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.candidate_leads.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
        include: {
          jobs: {
            select: {
              id: true,
              title: true,
            },
          },

          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          candidates: {
            select: {
              id: true,
              full_name: true,
            },
          },

          applications: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),

      prisma.candidate_leads.count({
        where,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: bigint) {
    const lead = await prisma.candidate_leads.findUnique({
      where: {
        id,
      },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },

        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        candidates: true,
        applications: true,
      },
    });

    if (!lead) {
      throw new AppError("ไม่พบ Candidate Lead", 404);
    }

    return lead;
  }

  async update(id: bigint, data: UpdateCandidateLeadDto) {
    const existingLead = await prisma.candidate_leads.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        status: true,
      },
    });

    if (!existingLead) {
      throw new AppError("ไม่พบ Candidate Lead", 404);
    }

    if (existingLead.status === candidate_leads_status.converted) {
      throw new AppError(
        "Candidate Lead นี้ถูก Convert แล้ว ไม่สามารถแก้ไขได้",
        409,
      );
    }

    const email =
      data.detected_email === null
        ? null
        : this.normalizeEmail(data.detected_email);

    const phone =
      data.detected_phone === null
        ? null
        : this.normalizePhone(data.detected_phone);

    if (email && !this.isValidEmail(email)) {
      throw new AppError("รูปแบบอีเมลไม่ถูกต้อง", 400);
    }

    if (data.target_job_id !== undefined && data.target_job_id !== null) {
      const job = await prisma.jobs.findUnique({
        where: {
          id: data.target_job_id,
        },

        select: {
          id: true,
        },
      });

      if (!job) {
        throw new AppError("ไม่พบตำแหน่งงาน", 404);
      }
    }

    const reviewedAt =
      data.status && data.status !== candidate_leads_status.new
        ? new Date()
        : undefined;

    return prisma.candidate_leads.update({
      where: {
        id,
      },

      data: {
        detected_name:
          data.detected_name === null ? null : data.detected_name?.trim(),

        detected_email: email,

        detected_phone: phone,

        detected_position:
          data.detected_position === null
            ? null
            : data.detected_position?.trim(),

        skills:
          data.skills === undefined
            ? undefined
            : this.uniqueStrings(data.skills),

        target_job_id: data.target_job_id,

        status: data.status,

        reviewed_by: data.reviewed_by,

        reviewed_at: reviewedAt,
      },

      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },

        // reviewers: {
        //   select: {
        //     id: true,
        //     name: true,
        //     email: true,
        //   },
        // },
      },
    });
  }

  async convert(id: bigint, data: ConvertCandidateLeadDto) {
    const lead = await prisma.candidate_leads.findUnique({
      where: {
        id,
      },
    });

    if (!lead) {
      throw new AppError("ไม่พบ Candidate Lead", 404);
    }

    if (lead.status === candidate_leads_status.converted) {
      throw new AppError("Candidate Lead นี้ถูก Convert แล้ว", 409);
    }

    if (lead.status === candidate_leads_status.rejected) {
      throw new AppError("ไม่สามารถ Convert Lead ที่ถูก Reject ได้", 409);
    }

    const fullName = data.full_name?.trim() || lead.detected_name?.trim();

    if (!fullName) {
      throw new AppError("กรุณาระบุชื่อผู้สมัครก่อน Convert", 400);
    }

    const email =
      data.email !== undefined
        ? this.normalizeEmail(data.email ?? undefined)
        : this.normalizeEmail(lead.detected_email ?? undefined);

    const phone =
      data.phone !== undefined
        ? this.normalizePhone(data.phone ?? undefined)
        : this.normalizePhone(lead.detected_phone ?? undefined);

    if (email && !this.isValidEmail(email)) {
      throw new AppError("รูปแบบอีเมลไม่ถูกต้อง", 400);
    }

    /*
     * ไม่จำเป็นต้องบังคับว่าต้องมีทั้งสองค่า
     * แต่ควรมีอีเมลหรือโทรศัพท์อย่างน้อยหนึ่งค่า
     */
    if (!email && !phone) {
      throw new AppError(
        "กรุณาระบุอีเมลหรือเบอร์โทรอย่างน้อยหนึ่งรายการก่อน Convert",
        400,
      );
    }

    if (
      data.total_experience_years !== undefined &&
      data.total_experience_years < 0
    ) {
      throw new AppError("จำนวนปีประสบการณ์ต้องไม่น้อยกว่า 0", 400);
    }

    await this.checkDuplicateCandidate(email, phone);

    const shouldCreateApplication =
      data.create_application ?? Boolean(data.job_id ?? lead.target_job_id);

    const selectedJobId =
      data.job_id !== undefined ? data.job_id : lead.target_job_id;

    let firstStage: {
      id: bigint;
    } | null = null;

    if (shouldCreateApplication && !selectedJobId) {
      throw new AppError("กรุณาเลือกตำแหน่งงานก่อนสร้าง Application", 400);
    }

    if (shouldCreateApplication && selectedJobId) {
      const job = await prisma.jobs.findUnique({
        where: {
          id: selectedJobId,
        },

        select: {
          id: true,
          status: true,

          pipeline_stages: {
            orderBy: {
              stage_order: "asc",
            },

            take: 1,

            select: {
              id: true,
            },
          },
        },
      });

      if (!job) {
        throw new AppError("ไม่พบตำแหน่งงาน", 404);
      }

      if (job.status === "closed") {
        throw new AppError("ตำแหน่งงานนี้ปิดรับสมัครแล้ว", 409);
      }

      firstStage = job.pipeline_stages[0] ?? null;

      if (!firstStage) {
        throw new AppError("ตำแหน่งงานนี้ยังไม่มี Pipeline Stage", 409);
      }
    }

    const rawSkills = Array.isArray(lead.skills)
      ? lead.skills.filter(
        (value): value is string => typeof value === "string",
      )
      : [];

    const skills = this.uniqueStrings(rawSkills);

    return prisma.$transaction(
      async (transaction) => {
        const candidate = await transaction.candidates.create({
          data: {
            full_name: fullName,

            email: email ?? null,

            phone: phone ?? null,

            linkedin_url: data.linkedin_url?.trim() || null,

            current_position:
              data.current_position?.trim() ||
              lead.detected_position?.trim() ||
              null,

            total_experience_years: data.total_experience_years ?? 0,

            source: this.mapLeadSourceToCandidateSource(lead.source),

            source_url: lead.source_url,
          },
        });

        /*
         * สร้าง Skills ที่ AI ตรวจพบ
         */
        if (skills.length > 0) {
          for (const skillName of skills) {
            const skill = await transaction.skills.upsert({
              where: {
                name: skillName,
              },

              update: {},

              create: {
                name: skillName,
              },
            });

            await transaction.candidate_skills.create({
              data: {
                candidate_id: candidate.id,

                skill_id: skill.id,
              },
            });
          }
        }

        let application: Awaited<
          ReturnType<typeof transaction.applications.create>
        > | null = null;

        if (shouldCreateApplication && selectedJobId && firstStage) {
          application = await transaction.applications.create({
            data: {
              candidate_id: candidate.id,

              job_id: selectedJobId,

              resume_id: null,

              current_stage_id: firstStage.id,

              assigned_hr_id: data.assigned_hr_id ?? null,

              status: applications_status.active,
            },
          });

          await transaction.application_stage_histories.create({
            data: {
              application_id: application.id,

              from_stage_id: null,

              to_stage_id: firstStage.id,

              changed_by: data.assigned_hr_id ?? null,

              note: "สร้างใบสมัครจาก Candidate Lead",
            },
          });
        }

        const updatedLead = await transaction.candidate_leads.update({
          where: {
            id: lead.id,
          },

          data: {
            detected_name: fullName,

            detected_email: email ?? null,

            detected_phone: phone ?? null,

            detected_position:
              data.current_position?.trim() || lead.detected_position,

            target_job_id: selectedJobId ?? null,

            status: candidate_leads_status.converted,

            reviewed_by: data.assigned_hr_id ?? null,

            reviewed_at: new Date(),

            converted_candidate_id: candidate.id,

            converted_application_id: application?.id ?? null,
          },
        });

        return {
          lead_id: updatedLead.id,

          candidate_id: candidate.id,

          application_id: application?.id ?? null,

          candidate,

          application,
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );
  }

  private normalizeEmail(value?: string): string | undefined {
    const normalized = value?.trim().toLowerCase();

    return normalized || undefined;
  }

  private normalizePhone(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().replace(/[\s()-]/g, "");

    if (normalized.startsWith("+66")) {
      return `0${normalized.slice(3)}`;
    }

    return normalized || undefined;
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private uniqueStrings(values: string[]): string[] {
    const map = new Map<string, string>();

    for (const value of values) {
      const normalized = value.trim();

      if (!normalized) {
        continue;
      }

      const key = normalized.toLowerCase();

      if (!map.has(key)) {
        map.set(key, normalized);
      }
    }

    return [...map.values()];
  }

  private async checkDuplicateCandidate(
    email?: string,
    phone?: string,
  ): Promise<void> {
    if (!email && !phone) {
      return;
    }

    const duplicate = await prisma.candidates.findFirst({
      where: {
        OR: [
          ...(email
            ? [
              {
                email,
              },
            ]
            : []),

          ...(phone
            ? [
              {
                phone,
              },
            ]
            : []),
        ],
      },

      select: {
        id: true,
        email: true,
        phone: true,
      },
    });

    if (!duplicate) {
      return;
    }

    if (email && duplicate.email === email) {
      throw new AppError("มี Candidate ที่ใช้อีเมลนี้อยู่แล้ว", 409);
    }

    if (phone && duplicate.phone === phone) {
      throw new AppError("มี Candidate ที่ใช้เบอร์โทรนี้อยู่แล้ว", 409);
    }
  }

  private mapLeadSourceToCandidateSource(source: string): candidates_source {
    switch (source) {
      case "facebook":
        return candidates_source.facebook;

      case "linkedin":
        return candidates_source.linkedin;

      case "manual":
      default:
        return candidates_source.manual;
    }
  }
}
