import fs from "fs/promises";
import path from "path";

import { prisma } from "@/config/db";
import {
  applications_status,
  candidates_source,
  resumes_parse_status,
  Prisma,
} from "@/generated/prisma/client";

import {
  CreateCandidateDto,
  CreateCandidateWithResumeDto,
  GetCandidatesQuery,
  UpdateCandidateDto,
} from "@/types/candidate.type";

import { AppError } from "@/utils/app-error";

export class CandidateService {
  async createCandidate(data: CreateCandidateDto) {
    const fullName = data.full_name?.trim();
    const email = this.normalizeEmail(data.email);
    const phone = this.normalizePhone(data.phone);

    if (!fullName) {
      throw new AppError("กรุณาระบุชื่อผู้สมัคร", 400);
    }

    if (email && !this.isValidEmail(email)) {
      throw new AppError("รูปแบบอีเมลไม่ถูกต้อง", 400);
    }

    if (
      data.total_experience_years !== undefined &&
      data.total_experience_years < 0
    ) {
      throw new AppError("จำนวนปีประสบการณ์ต้องไม่น้อยกว่า 0", 400);
    }

    await this.checkDuplicateCandidate(email, phone);

    return prisma.candidates.create({
      data: {
        full_name: fullName,
        email,
        phone,
        linkedin_url: data.linkedin_url?.trim(),
        current_position: data.current_position?.trim(),

        total_experience_years: data.total_experience_years ?? 0,

        source: data.source ?? candidates_source.manual,

        source_url: data.source_url?.trim(),
      },
    });
  }

  async getAllCandidates(query: GetCandidatesQuery = {}) {
    const page = Math.max(query.page ?? 1, 1);

    const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);

    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const where: Prisma.candidatesWhereInput = {
      source: query.source,

      OR: search
        ? [
          {
            full_name: {
              contains: search,
            },
          },
          {
            email: {
              contains: search,
            },
          },
          {
            phone: {
              contains: search,
            },
          },
          {
            current_position: {
              contains: search,
            },
          },
        ]
        : undefined,
    };

    const [candidates, total] = await prisma.$transaction([
      prisma.candidates.findMany({
        where,
        skip,
        take: limit,

        orderBy: {
          created_at: "desc",
        },

        include: {
          _count: {
            select: {
              resumes: true,
              applications: true,
              candidate_skills: true,
            },
          },
        },
      }),

      prisma.candidates.count({
        where,
      }),
    ]);

    return {
      candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCandidateById(id: string) {
    const candidateId = this.parseId(id);

    const candidate = await prisma.candidates.findUnique({
      where: {
        id: candidateId,
      },

      include: {
        candidate_skills: {
          include: {
            skills: true,
          },
        },

        candidate_experiences: {
          orderBy: {
            start_date: "desc",
          },
        },

        candidate_educations: {
          orderBy: {
            end_year: "desc",
          },
        },

        candidate_languages: true,

        candidate_certificates: {
          orderBy: {
            issue_date: "desc",
          },
        },
        resumes: {
          orderBy: {
            uploaded_at: "desc",
          },
        },
        applications: {
          include: {
            jobs: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },

            pipeline_stages: {
              select: {
                id: true,
                name: true,
                stage_order: true,
                stage_type: true,
              },
            },
          },

          orderBy: {
            applied_at: "desc",
          },
        },
      },
    });

    if (!candidate) {
      throw new AppError("ไม่พบข้อมูลผู้สมัคร", 404);
    }

    return candidate;
  }

  async updateCandidate(id: string, data: UpdateCandidateDto) {
    const candidateId = this.parseId(id);

    const existingCandidate = await prisma.candidates.findUnique({
      where: {
        id: candidateId,
      },
    });

    if (!existingCandidate) {
      throw new AppError("ไม่พบข้อมูลผู้สมัคร", 404);
    }

    if (data.full_name !== undefined && !data.full_name.trim()) {
      throw new AppError("ชื่อผู้สมัครห้ามเป็นค่าว่าง", 400);
    }

    if (
      data.total_experience_years !== undefined &&
      data.total_experience_years < 0
    ) {
      throw new AppError("จำนวนปีประสบการณ์ต้องไม่น้อยกว่า 0", 400);
    }

    const email = data.email === null ? null : this.normalizeEmail(data.email);

    const phone = data.phone === null ? null : this.normalizePhone(data.phone);

    if (email && !this.isValidEmail(email)) {
      throw new AppError("รูปแบบอีเมลไม่ถูกต้อง", 400);
    }

    await this.checkDuplicateCandidate(
      email ?? undefined,
      phone ?? undefined,
      candidateId,
    );

    return prisma.candidates.update({
      where: {
        id: candidateId,
      },

      data: {
        full_name: data.full_name?.trim(),
        email,
        phone,

        linkedin_url:
          data.linkedin_url === null ? null : data.linkedin_url?.trim(),

        current_position:
          data.current_position === null ? null : data.current_position?.trim(),

        total_experience_years: data.total_experience_years,

        source: data.source,

        source_url: data.source_url === null ? null : data.source_url?.trim(),
      },
    });
  }

  async deleteCandidate(id: string) {
    const candidateId = this.parseId(id);

    const candidate = await prisma.candidates.findUnique({
      where: {
        id: candidateId,
      },

      select: {
        id: true,

        _count: {
          select: {
            applications: true,
            resumes: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new AppError("ไม่พบข้อมูลผู้สมัคร", 404);
    }

    // if (candidate._count.applications > 0) {
    //   throw new AppError("ไม่สามารถลบผู้สมัครที่มีประวัติการสมัครงานได้", 409);
    // }

    await prisma.candidates.delete({
      where: {
        id: candidateId,
      },
    });
  }

  private async checkDuplicateCandidate(
    email?: string,
    phone?: string,
    excludeId?: bigint,
  ): Promise<void> {
    if (!email && !phone) {
      return;
    }

    const duplicate = await prisma.candidates.findFirst({
      where: {
        id: excludeId
          ? {
            not: excludeId,
          }
          : undefined,

        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },

      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
      },
    });

    if (!duplicate) {
      return;
    }

    // if (email && duplicate.email === email) {
    //   throw new AppError("มีผู้สมัครที่ใช้อีเมลนี้อยู่แล้ว", 409);
    // }

    // if (phone && duplicate.phone === phone) {
    //   throw new AppError("มีผู้สมัครที่ใช้เบอร์โทรนี้อยู่แล้ว", 409);
    // }
  }

  private parseId(id: string): bigint {
    if (!id || !/^\d+$/.test(id)) {
      throw new AppError("รหัสผู้สมัครไม่ถูกต้อง", 400);
    }

    const candidateId = BigInt(id);

    if (candidateId <= 0n) {
      throw new AppError("รหัสผู้สมัครไม่ถูกต้อง", 400);
    }

    return candidateId;
  }

  private normalizeEmail(email?: string): string | undefined {
    const normalized = email?.trim().toLowerCase();

    return normalized || undefined;
  }

  private normalizePhone(phone?: string): string | undefined {
    if (!phone) {
      return undefined;
    }

    const normalized = phone.trim().replace(/[\s()-]/g, "");

    if (normalized.startsWith("+66")) {
      return `0${normalized.slice(3)}`;
    }

    return normalized || undefined;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async createWithResume(
    data: CreateCandidateWithResumeDto,
    file?: Express.Multer.File,
  ) {
    const fullName = data.full_name?.trim();

    if (!fullName) {
      await this.removeUploadedFile(file);

      throw new AppError("กรุณาระบุชื่อผู้สมัคร", 400);
    }

    const email = this.normalizeEmail(data.email);

    const phone = this.normalizePhone(data.phone);

    if (!email && !phone) {
      await this.removeUploadedFile(file);

      throw new AppError("กรุณาระบุอีเมลหรือเบอร์โทรอย่างน้อยหนึ่งรายการ", 400);
    }

    if (email && !this.isValidEmail(email)) {
      await this.removeUploadedFile(file);

      throw new AppError("รูปแบบอีเมลไม่ถูกต้อง", 400);
    }

    if (
      data.total_experience_years !== undefined &&
      data.total_experience_years < 0
    ) {
      await this.removeUploadedFile(file);

      throw new AppError("จำนวนปีประสบการณ์ต้องไม่น้อยกว่า 0", 400);
    }

    try {
      await this.checkDuplicateCandidate(email, phone);
    } catch (error) {
      await this.removeUploadedFile(file);
      throw error;
    }

    let firstStage: {
      id: bigint;
    } | null = null;

    if (data.job_id) {
      const job = await prisma.jobs.findUnique({
        where: {
          id: data.job_id,
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
        await this.removeUploadedFile(file);

        throw new AppError("ไม่พบตำแหน่งงาน", 404);
      }

      if (job.status === "closed") {
        await this.removeUploadedFile(file);

        throw new AppError("ตำแหน่งงานนี้ปิดรับสมัครแล้ว", 409);
      }

      firstStage = job.pipeline_stages[0] ?? null;

      if (!firstStage) {
        await this.removeUploadedFile(file);

        throw new AppError("ตำแหน่งงานนี้ยังไม่มี Pipeline Stage", 409);
      }
    }

    try {
      return await prisma.$transaction(
        async (transaction) => {
          const candidate = await transaction.candidates.create({
            data: {
              full_name: fullName,

              email: email ?? null,

              phone: phone ?? null,

              linkedin_url: data.linkedin_url?.trim() || null,

              current_position: data.current_position?.trim() || null,

              total_experience_years: data.total_experience_years ?? 0,

              source: data.source ?? candidates_source.manual,

              source_url: data.source_url?.trim() || null,
            },
          });

          let resume: Awaited<
            ReturnType<typeof transaction.resumes.create>
          > | null = null;

          if (file) {
            resume = await transaction.resumes.create({
              data: {
                candidate_id: candidate.id,

                original_file_name: file.originalname,

                file_url: `/uploads/resumes/${file.filename}`,

                mime_type: file.mimetype,

                file_size: file.size,

                is_primary: true,

                parse_status: resumes_parse_status.pending,
              },
            });
          }

          let application: Awaited<
            ReturnType<typeof transaction.applications.create>
          > | null = null;

          if (data.job_id && firstStage) {
            application = await transaction.applications.create({
              data: {
                candidate_id: candidate.id,

                job_id: data.job_id,

                resume_id: resume?.id ?? null,

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

                note: "สร้างใบสมัครพร้อม Candidate",
              },
            });
          }

          return {
            candidate,
            resume,
            application,
          };
        },
        {
          maxWait: 5_000,
          timeout: 15_000,
        },
      );
    } catch (error) {
      await this.removeUploadedFile(file);

      throw error;
    }
  }
  private async removeUploadedFile(file?: Express.Multer.File): Promise<void> {
    if (!file?.path) {
      return;
    }

    try {
      await fs.unlink(path.resolve(file.path));
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code !== "ENOENT") {
        console.error(`ไม่สามารถลบไฟล์ที่อัปโหลดได้: ${file.path}`, error);
      }
    }
  }
}
