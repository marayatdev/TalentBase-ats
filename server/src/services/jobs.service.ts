import { prisma } from "@/config/db";
import {
  jobs_employment_type,
  jobs_status,
  Prisma,
} from "@/generated/prisma/client";
import { CreateJobDto, GetJobsQuery, UpdateJobDto } from "@/types/job.type";
import { AppError } from "@/utils/app-error";

export class JobService {
  async createJob(data: CreateJobDto) {
    const title = data.title?.trim();

    if (!title) {
      throw new AppError("กรุณาระบุชื่อตำแหน่งงาน", 400);
    }

    this.validateSalary(data.salary_min, data.salary_max);

    const duplicateJob = await prisma.jobs.findFirst({
      where: {
        title,
        status: {
          not: jobs_status.closed,
        },
      },
    });

    if (duplicateJob) {
      throw new AppError("มีตำแหน่งงานชื่อนี้เปิดอยู่แล้ว", 409);
    }

    return prisma.jobs.create({
      data: {
        title,
        description: data.description?.trim(),
        requirements: data.requirements?.trim(),

        employment_type: data.employment_type ?? jobs_employment_type.full_time,

        minimum_experience_years: data.minimum_experience_years ?? 0,

        salary_min: data.salary_min,
        salary_max: data.salary_max,

        number_of_positions: data.number_of_positions ?? 1,

        status: data.status ?? jobs_status.open,

        created_by: data.created_by,
      },
    });
  }

  async getAllJobs(query: GetJobsQuery = {}) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);

    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.jobsWhereInput = {
      status: query.status,
      employment_type: query.employment_type,

      OR: search
        ? [
            {
              title: {
                contains: search,
              },
            },
            {
              description: {
                contains: search,
              },
            },
            {
              requirements: {
                contains: search,
              },
            },
          ]
        : undefined,
    };

    const [jobs, total] = await Promise.all([
      prisma.jobs.findMany({
        where,
        skip,
        take: limit,

        orderBy: {
          created_at: "desc",
        },

        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),

      prisma.jobs.count({
        where,
      }),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getJobById(id: string) {
    const jobId = this.parseId(id);

    const job = await prisma.jobs.findUnique({
      where: {
        id: jobId,
      },

      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        job_skills: {
          include: {
            skills: true,
          },
        },

        pipeline_stages: {
          orderBy: {
            stage_order: "asc",
          },
        },

        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      throw new AppError("ไม่พบตำแหน่งงาน", 404);
    }

    return job;
  }

  async updateJob(id: string, data: UpdateJobDto) {
    const jobId = this.parseId(id);

    const existingJob = await prisma.jobs.findUnique({
      where: {
        id: jobId,
      },
    });

    if (!existingJob) {
      throw new AppError("ไม่พบตำแหน่งงาน", 404);
    }

    const salaryMin =
      data.salary_min !== undefined
        ? data.salary_min
        : existingJob.salary_min?.toNumber();

    const salaryMax =
      data.salary_max !== undefined
        ? data.salary_max
        : existingJob.salary_max?.toNumber();

    this.validateSalary(salaryMin, salaryMax);

    if (
      data.number_of_positions !== undefined &&
      data.number_of_positions < 1
    ) {
      throw new AppError("จำนวนตำแหน่งที่รับต้องไม่น้อยกว่า 1", 400);
    }

    if (
      data.minimum_experience_years !== undefined &&
      data.minimum_experience_years < 0
    ) {
      throw new AppError("จำนวนปีประสบการณ์ต้องไม่น้อยกว่า 0", 400);
    }

    return prisma.jobs.update({
      where: {
        id: jobId,
      },

      data: {
        title: data.title?.trim(),

        description:
          data.description === null ? null : data.description?.trim(),

        requirements:
          data.requirements === null ? null : data.requirements?.trim(),

        employment_type: data.employment_type,

        minimum_experience_years: data.minimum_experience_years,

        salary_min: data.salary_min,
        salary_max: data.salary_max,

        number_of_positions: data.number_of_positions,

        status: data.status,
      },
    });
  }

  async deleteJob(id: string) {
    const jobId = this.parseId(id);

    const existingJob = await prisma.jobs.findUnique({
      where: {
        id: jobId,
      },

      select: {
        id: true,
        status: true,

        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!existingJob) {
      throw new AppError("ไม่พบตำแหน่งงาน", 404);
    }

    if (existingJob._count.applications > 0) {
      throw new AppError(
        "ไม่สามารถลบตำแหน่งที่มีผู้สมัครได้ กรุณาเปลี่ยนสถานะเป็น closed",
        409,
      );
    }

    await prisma.jobs.delete({
      where: {
        id: jobId,
      },
    });
  }

  private parseId(id: string): bigint {
    if (!id || !/^\d+$/.test(id)) {
      throw new AppError("รหัสตำแหน่งงานไม่ถูกต้อง", 400);
    }

    const jobId = BigInt(id);

    if (jobId <= 0n) {
      throw new AppError("รหัสตำแหน่งงานไม่ถูกต้อง", 400);
    }

    return jobId;
  }

  private validateSalary(
    salaryMin?: number | null,
    salaryMax?: number | null,
  ): void {
    if (salaryMin !== undefined && salaryMin !== null && salaryMin < 0) {
      throw new AppError("เงินเดือนขั้นต่ำต้องไม่น้อยกว่า 0", 400);
    }

    if (salaryMax !== undefined && salaryMax !== null && salaryMax < 0) {
      throw new AppError("เงินเดือนสูงสุดต้องไม่น้อยกว่า 0", 400);
    }

    if (
      salaryMin !== undefined &&
      salaryMin !== null &&
      salaryMax !== undefined &&
      salaryMax !== null &&
      salaryMax < salaryMin
    ) {
      throw new AppError("เงินเดือนสูงสุดต้องไม่น้อยกว่าเงินเดือนขั้นต่ำ", 400);
    }
  }
}
