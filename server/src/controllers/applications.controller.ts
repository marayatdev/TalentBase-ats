import { NextFunction, Request, Response } from "express";
import { applications_status } from "@/generated/prisma/client";
import { ApplicationService } from "@/services/applications.service";
import {
  CreateApplicationDto,
  GetApplicationsQuery,
  MoveApplicationStageDto,
  UpdateApplicationStatusDto,
} from "@/types/application.type";
import { AppError } from "@/utils/app-error";
import { ResponseFormatter } from "@/utils/response";

const applicationService = new ApplicationService();

export class ApplicationController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const candidateId = this.parseBodyId(
        req.body.candidate_id,
        "candidate_id",
      );

      const jobId = this.parseBodyId(req.body.job_id, "job_id");

      const resumeId =
        req.body.resume_id !== undefined
          ? this.parseBodyId(req.body.resume_id, "resume_id")
          : undefined;

      const body: CreateApplicationDto = {
        candidate_id: candidateId,
        job_id: jobId,
        resume_id: resumeId,

        assigned_hr_id: req.user?.id ? BigInt(req.user.id) : undefined,
      };

      const application = await applicationService.createApplication(body);

      ResponseFormatter.created(res, application, "สร้างใบสมัครงานสำเร็จ");
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
      const query: GetApplicationsQuery = {
        page: this.parseNumber(req.query.page),
        limit: this.parseNumber(req.query.limit),

        search:
          typeof req.query.search === "string"
            ? req.query.search.trim()
            : undefined,

        job_id: this.parseOptionalQueryId(req.query.job_id),

        candidate_id: this.parseOptionalQueryId(req.query.candidate_id),

        stage_id: this.parseOptionalQueryId(req.query.stage_id),

        status:
          typeof req.query.status === "string"
            ? (req.query.status as applications_status)
            : undefined,
      };

      const result = await applicationService.getAllApplications(query);

      ResponseFormatter.success(res, result, "ดึงรายการใบสมัครสำเร็จ");
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
      const application = await applicationService.getApplicationById(
        req.params.id,
      );

      ResponseFormatter.success(res, application, "ดึงข้อมูลใบสมัครสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const allowedStatuses = Object.values(applications_status);

      if (!allowedStatuses.includes(req.body.status)) {
        throw new AppError("สถานะใบสมัครไม่ถูกต้อง", 400);
      }

      const body: UpdateApplicationStatusDto = {
        status: req.body.status,
      };

      const application = await applicationService.updateStatus(
        req.params.id,
        body,
      );

      ResponseFormatter.success(res, application, "แก้ไขสถานะใบสมัครสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async moveStage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stageId = this.parseBodyId(req.body.stage_id, "stage_id");

      const body: MoveApplicationStageDto = {
        stage_id: stageId,

        changed_by: req.user?.id ? BigInt(req.user.id) : undefined,

        note: typeof req.body.note === "string" ? req.body.note : undefined,
      };

      const application = await applicationService.moveStage(
        req.params.id,
        body,
      );

      ResponseFormatter.success(res, application, "ย้าย Pipeline Stage สำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await applicationService.deleteApplication(req.params.id);

      ResponseFormatter.success(res, null, "ลบใบสมัครสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  private parseBodyId(value: unknown, fieldName: string): bigint {
    const stringValue = String(value ?? "");

    if (!/^\d+$/.test(stringValue)) {
      throw new AppError(`${fieldName} ไม่ถูกต้อง`, 400);
    }

    const parsedId = BigInt(stringValue);

    if (parsedId <= 0n) {
      throw new AppError(`${fieldName} ไม่ถูกต้อง`, 400);
    }

    return parsedId;
  }

  private parseOptionalQueryId(value: unknown): bigint | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    if (!/^\d+$/.test(value)) {
      throw new AppError("รหัสสำหรับค้นหาไม่ถูกต้อง", 400);
    }

    return BigInt(value);
  }

  private parseNumber(value: unknown): number | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : undefined;
  }
}
