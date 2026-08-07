import fs from "fs/promises";
import path from "path";
import { prisma } from "@/config/db";
import {
  applications_status,
  resumes_parse_status,
} from "@/generated/prisma/client";
import { CreateResumeDto } from "@/types/resume.type";
import { AppError } from "@/utils/app-error";

export class ResumeService {
  async createResume(data: CreateResumeDto) {
    const candidate = await prisma.candidates.findUnique({
      where: {
        id: data.candidate_id,
      },

      select: {
        id: true,
        full_name: true,
      },
    });

    if (!candidate) {
      throw new AppError("ไม่พบข้อมูลผู้สมัคร", 404);
    }

    return prisma.$transaction(async (transaction) => {
      const resumeCount = await transaction.resumes.count({
        where: {
          candidate_id: data.candidate_id,
        },
      });

      const shouldBePrimary = data.is_primary === true || resumeCount === 0;

      if (shouldBePrimary) {
        await transaction.resumes.updateMany({
          where: {
            candidate_id: data.candidate_id,
            is_primary: true,
          },

          data: {
            is_primary: false,
          },
        });
      }

      const resume = await transaction.resumes.create({
        data: {
          candidate_id: data.candidate_id,

          original_file_name: data.original_file_name,

          file_url: data.file_url,
          mime_type: data.mime_type,
          file_size: data.file_size,

          is_primary: shouldBePrimary,

          parse_status: resumes_parse_status.pending,
        },
      });

      /*
       * ผูก Resume ที่อัปโหลดใหม่กับ Application
       * ที่ยังไม่มี Resume
       */
      await transaction.applications.updateMany({
        where: {
          candidate_id: data.candidate_id,
          resume_id: null,
          status: applications_status.active,
        },

        data: {
          resume_id: resume.id,
        },
      });

      return resume;
    });
  }

  async getResumesByCandidateId(candidateId: string) {
    const parsedCandidateId = this.parseId(candidateId, "ผู้สมัคร");

    const candidate = await prisma.candidates.findUnique({
      where: {
        id: parsedCandidateId,
      },

      select: {
        id: true,
        full_name: true,
      },
    });

    if (!candidate) {
      throw new AppError("ไม่พบข้อมูลผู้สมัคร", 404);
    }

    const resumes = await prisma.resumes.findMany({
      where: {
        candidate_id: parsedCandidateId,
      },

      orderBy: [
        {
          is_primary: "desc",
        },
        {
          uploaded_at: "desc",
        },
      ],

      include: {
        ai_resume_results: {
          select: {
            id: true,
            summary: true,
            processed_at: true,
            error_message: true,
          },
        },
      },
    });

    return {
      candidate,
      resumes,
    };
  }

  async getResumeById(id: string) {
    const resumeId = this.parseId(id, "Resume");

    const resume = await prisma.resumes.findUnique({
      where: {
        id: resumeId,
      },

      include: {
        candidates: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },

        applications: {
      select: {
        id: true,
        job_id: true,
        status: true,

        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },

      orderBy: {
        applied_at: "desc",
      },
    },

        ai_resume_results: true,
      },
    });

    if (!resume) {
      throw new AppError("ไม่พบ Resume", 404);
    }

    return resume;
  }

  async setPrimaryResume(id: string) {
    const resumeId = this.parseId(id, "Resume");

    const resume = await prisma.resumes.findUnique({
      where: {
        id: resumeId,
      },

      select: {
        id: true,
        candidate_id: true,
        is_primary: true,
      },
    });

    if (!resume) {
      throw new AppError("ไม่พบ Resume", 404);
    }

    if (resume.is_primary) {
      await prisma.applications.updateMany({
        where: {
          candidate_id: resume.candidate_id,
          resume_id: null,
          status: applications_status.active,
        },

        data: {
          resume_id: resume.id,
        },
      });

      return prisma.resumes.findUnique({
        where: {
          id: resumeId,
        },
      });
    }

    return prisma.$transaction(async (transaction) => {
      await transaction.resumes.updateMany({
        where: {
          candidate_id: resume.candidate_id,
          is_primary: true,
        },

        data: {
          is_primary: false,
        },
      });

      const updatedResume = await transaction.resumes.update({
        where: {
          id: resumeId,
        },

        data: {
          is_primary: true,
        },
      });

      /*
       * ให้ Application ที่ยัง active ใช้ Resume หลักตัวใหม่
       */
      await transaction.applications.updateMany({
        where: {
          candidate_id: resume.candidate_id,
          status: applications_status.active,
        },

        data: {
          resume_id: updatedResume.id,
        },
      });

      return updatedResume;
    });
  }

  async deleteResume(id: string) {
    const resumeId = this.parseId(id, "Resume");

    const resume = await prisma.resumes.findUnique({
      where: {
        id: resumeId,
      },

      select: {
        id: true,
        candidate_id: true,
        file_url: true,
        is_primary: true,

        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!resume) {
      throw new AppError("ไม่พบ Resume", 404);
    }

    if (resume._count.applications > 0) {
      throw new AppError("ไม่สามารถลบ Resume ที่ถูกใช้ในใบสมัครงานได้", 409);
    }

    const nextResume = resume.is_primary
      ? await prisma.resumes.findFirst({
          where: {
            candidate_id: resume.candidate_id,
            id: {
              not: resumeId,
            },
          },

          orderBy: {
            uploaded_at: "desc",
          },

          select: {
            id: true,
          },
        })
      : null;

    await prisma.$transaction(async (transaction) => {
      await transaction.resumes.delete({
        where: {
          id: resumeId,
        },
      });

      if (nextResume) {
        await transaction.resumes.update({
          where: {
            id: nextResume.id,
          },

          data: {
            is_primary: true,
          },
        });
      }
    });

    await this.deletePhysicalFile(resume.file_url);
  }

  async deleteUploadedFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // ป้องกันไม่ให้ error ตอนลบไฟล์ชั่วคราว
      // ไปทับ error หลักของ request
    }
  }

  private async deletePhysicalFile(fileUrl: string): Promise<void> {
    const relativePath = fileUrl.replace(/^\/uploads\//, "");

    const absolutePath = path.resolve(process.cwd(), "uploads", relativePath);

    const uploadsDirectory = path.resolve(process.cwd(), "uploads");

    if (!absolutePath.startsWith(uploadsDirectory)) {
      return;
    }

    try {
      await fs.unlink(absolutePath);
    } catch {
      // ไฟล์อาจถูกลบไปแล้ว แต่ข้อมูล DB ถูกลบสำเร็จ
    }
  }

  private parseId(id: string, entity: string): bigint {
    if (!id || !/^\d+$/.test(id)) {
      throw new AppError(`รหัส${entity}ไม่ถูกต้อง`, 400);
    }

    const parsedId = BigInt(id);

    if (parsedId <= 0n) {
      throw new AppError(`รหัส${entity}ไม่ถูกต้อง`, 400);
    }

    return parsedId;
  }
}
