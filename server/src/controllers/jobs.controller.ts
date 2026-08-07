import { NextFunction, Request, Response } from "express";
import { jobs_employment_type, jobs_status } from "@/generated/prisma/client";
import { JobService } from "@/services/jobs.service";
import { CreateJobDto, GetJobsQuery, UpdateJobDto } from "@/types/job.type";
import { ResponseFormatter } from "@/utils/response";

const jobService = new JobService();

export class JobController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: CreateJobDto = {
        ...req.body,
        created_by: req.user?.id ? BigInt(req.user.id) : undefined,
      };

      const job = await jobService.createJob(body);

      ResponseFormatter.created(res, job, "สร้างตำแหน่งงานสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async findAll(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const query: GetJobsQuery = {
        page: this.parseNumber(req.query.page),
        limit: this.parseNumber(req.query.limit),

        search:
          typeof req.query.search === "string"
            ? req.query.search.trim()
            : undefined,

        status:
          typeof req.query.status === "string"
            ? (req.query.status as jobs_status)
            : undefined,

        employment_type:
          typeof req.query.employment_type === "string"
            ? (req.query.employment_type as jobs_employment_type)
            : undefined,
      };

      const result = await jobService.getAllJobs(query);

      ResponseFormatter.success(res, result, "ดึงรายการตำแหน่งงานสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async findOne(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const job = await jobService.getJobById(req.params.id);

      ResponseFormatter.success(res, job, "ดึงข้อมูลตำแหน่งงานสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: UpdateJobDto = req.body;

      const job = await jobService.updateJob(req.params.id, body);

      ResponseFormatter.success(res, job, "แก้ไขตำแหน่งงานสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await jobService.deleteJob(req.params.id);

      ResponseFormatter.success(res, null, "ลบตำแหน่งงานสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  private parseNumber(value: unknown): number | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }
}
