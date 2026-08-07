import { prisma } from "@/config/db";
import {
  applications_status,
  pipeline_stages_stage_type,
  Prisma,
} from "@/generated/prisma/client";
import {
  CreateApplicationDto,
  GetApplicationsQuery,
  MoveApplicationStageDto,
  UpdateApplicationStatusDto,
} from "@/types/application.type";
import { AppError } from "@/utils/app-error";

export class ApplicationService {
  async createApplication(data: CreateApplicationDto) {
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

    const job = await prisma.jobs.findUnique({
      where: {
        id: data.job_id,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (!job) {
      throw new AppError("ไม่พบตำแหน่งงาน", 404);
    }

    if (job.status === "closed") {
      throw new AppError("ตำแหน่งงานนี้ปิดรับสมัครแล้ว", 409);
    }

    const existingApplication = await prisma.applications.findUnique({
      where: {
        candidate_id_job_id: {
          candidate_id: data.candidate_id,
          job_id: data.job_id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingApplication) {
      throw new AppError("ผู้สมัครคนนี้สมัครตำแหน่งนี้แล้ว", 409);
    }

    const resume = await this.resolveResume(data.candidate_id, data.resume_id);

    const firstStage = await prisma.pipeline_stages.findFirst({
      where: {
        job_id: data.job_id,
      },
      orderBy: {
        stage_order: "asc",
      },
    });

    if (!firstStage) {
      throw new AppError("ตำแหน่งงานนี้ยังไม่มี Pipeline Stage", 409);
    }

    return prisma.$transaction(async (transaction) => {
      const application = await transaction.applications.create({
        data: {
          candidate_id: data.candidate_id,
          job_id: data.job_id,
          resume_id: resume.id,
          current_stage_id: firstStage.id,
          assigned_hr_id: data.assigned_hr_id,
          status: applications_status.active,
        },
        include: {
          candidates: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
          jobs: {
            select: {
              id: true,
              title: true,
            },
          },
          resumes: {
            select: {
              id: true,
              original_file_name: true,
              file_url: true,
            },
          },
          pipeline_stages: true,
        },
      });

      await transaction.application_stage_histories.create({
        data: {
          application_id: application.id,
          from_stage_id: null,
          to_stage_id: firstStage.id,
          changed_by: data.assigned_hr_id,
          note: "สร้างใบสมัครงาน",
        },
      });

      return application;
    });
  }

  async getAllApplications(query: GetApplicationsQuery = {}) {
    const page = Math.max(query.page ?? 1, 1);

    const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);

    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.applicationsWhereInput = {
      job_id: query.job_id,
      candidate_id: query.candidate_id,
      current_stage_id: query.stage_id,
      status: query.status,

      OR: search
        ? [
            {
              candidates: {
                full_name: {
                  contains: search,
                },
              },
            },
            {
              candidates: {
                email: {
                  contains: search,
                },
              },
            },
            {
              jobs: {
                title: {
                  contains: search,
                },
              },
            },
          ]
        : undefined,
    };

    const [applications, total] = await prisma.$transaction([
      prisma.applications.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          applied_at: "desc",
        },
        include: {
          candidates: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
            },
          },
          jobs: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          resumes: {
            select: {
              id: true,
              original_file_name: true,
              file_url: true,
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
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),

      prisma.applications.count({
        where,
      }),
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getApplicationById(id: string) {
    const applicationId = this.parseId(id, "ใบสมัคร");

    const application = await prisma.applications.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        candidates: {
          include: {
            candidate_skills: {
              include: {
                skills: true,
              },
            },
          },
        },

        jobs: {
          include: {
            job_skills: {
              include: {
                skills: true,
              },
            },
          },
        },

        resumes: {
          include: {
            ai_resume_results: true,
          },
        },

        pipeline_stages: true,

        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        application_stage_histories: {
          orderBy: {
            changed_at: "asc",
          },
          include: {
            pipeline_stages_application_stage_histories_from_stage_idTopipeline_stages:
              true,

            pipeline_stages_application_stage_histories_to_stage_idTopipeline_stages:
              true,

            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new AppError("ไม่พบใบสมัครงาน", 404);
    }

    return application;
  }

  async updateStatus(id: string, data: UpdateApplicationStatusDto) {
    const applicationId = this.parseId(id, "ใบสมัคร");

    const application = await prisma.applications.findUnique({
      where: {
        id: applicationId,
      },
      select: {
        id: true,
      },
    });

    if (!application) {
      throw new AppError("ไม่พบใบสมัครงาน", 404);
    }

    return prisma.applications.update({
      where: {
        id: applicationId,
      },
      data: {
        status: data.status,
      },
    });
  }

  async moveStage(id: string, data: MoveApplicationStageDto) {
    const applicationId = this.parseId(id, "ใบสมัคร");

    const application = await prisma.applications.findUnique({
      where: {
        id: applicationId,
      },
      select: {
        id: true,
        job_id: true,
        current_stage_id: true,
        status: true,
      },
    });

    if (!application) {
      throw new AppError("ไม่พบใบสมัครงาน", 404);
    }

    if (application.status !== applications_status.active) {
      throw new AppError("สามารถย้าย Stage ได้เฉพาะใบสมัครที่ยัง active", 409);
    }

    const targetStage = await prisma.pipeline_stages.findUnique({
      where: {
        id: data.stage_id,
      },
    });

    if (!targetStage) {
      throw new AppError("ไม่พบ Pipeline Stage ที่เลือก", 404);
    }

    if (targetStage.job_id !== application.job_id) {
      throw new AppError(
        `Stage นี้เป็นของ job_id=${targetStage.job_id.toString()} แต่ Application เป็นของ job_id=${application.job_id.toString()}`,
        400,
      );
    }

    if (application.current_stage_id === targetStage.id) {
      throw new AppError("ใบสมัครอยู่ใน Stage นี้แล้ว", 409);
    }

    const nextStatus = this.getStatusFromStageType(targetStage.stage_type);

    return prisma.$transaction(async (transaction) => {
      const updatedApplication = await transaction.applications.update({
        where: {
          id: applicationId,
        },
        data: {
          current_stage_id: targetStage.id,
          status: nextStatus,
        },
        include: {
          candidates: {
            select: {
              id: true,
              full_name: true,
            },
          },
          jobs: {
            select: {
              id: true,
              title: true,
            },
          },
          pipeline_stages: true,
        },
      });

      await transaction.application_stage_histories.create({
        data: {
          application_id: applicationId,
          from_stage_id: application.current_stage_id,
          to_stage_id: targetStage.id,
          changed_by: data.changed_by,
          note: data.note?.trim(),
        },
      });

      return updatedApplication;
    });
  }

  async deleteApplication(id: string) {
    const applicationId = this.parseId(id, "ใบสมัคร");

    const application = await prisma.applications.findUnique({
      where: {
        id: applicationId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!application) {
      throw new AppError("ไม่พบใบสมัครงาน", 404);
    }

    if (application.status === applications_status.hired) {
      throw new AppError("ไม่สามารถลบใบสมัครที่รับเข้าทำงานแล้ว", 409);
    }

    await prisma.applications.delete({
      where: {
        id: applicationId,
      },
    });
  }

  private async resolveResume(candidateId: bigint, resumeId?: bigint) {
    if (resumeId) {
      const resume = await prisma.resumes.findFirst({
        where: {
          id: resumeId,
          candidate_id: candidateId,
        },
      });

      if (!resume) {
        throw new AppError("Resume ไม่ได้เป็นของผู้สมัครคนนี้", 400);
      }

      return resume;
    }

    const latestResume = await prisma.resumes.findFirst({
      where: {
        candidate_id: candidateId,
      },
      orderBy: {
        uploaded_at: "desc",
      },
    });

    if (!latestResume) {
      throw new AppError("ผู้สมัครยังไม่มี Resume", 409);
    }

    return latestResume;
  }

  private getStatusFromStageType(
    stageType: pipeline_stages_stage_type,
  ): applications_status {
    if (stageType === pipeline_stages_stage_type.hired) {
      return applications_status.hired;
    }

    if (stageType === pipeline_stages_stage_type.rejected) {
      return applications_status.rejected;
    }

    return applications_status.active;
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
