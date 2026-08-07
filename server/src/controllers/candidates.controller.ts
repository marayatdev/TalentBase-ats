import { NextFunction, Request, Response } from "express";
import { candidates_source } from "@/generated/prisma/client";
import { CandidateService } from "@/services/candidates.service";
import {
  CreateCandidateDto,
  CreateCandidateWithResumeDto,
  GetCandidatesQuery,
  UpdateCandidateDto,
} from "@/types/candidate.type";
import { ResponseFormatter } from "@/utils/response";
import { AppError } from "@/utils/app-error";

const candidateService = new CandidateService();

export class CandidateController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: CreateCandidateDto = req.body;

      const candidate = await candidateService.createCandidate(body);

      ResponseFormatter.created(res, candidate, "สร้างข้อมูลผู้สมัครสำเร็จ");
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
      const query: GetCandidatesQuery = {
        page: this.parseNumber(req.query.page),
        limit: this.parseNumber(req.query.limit),

        search:
          typeof req.query.search === "string"
            ? req.query.search.trim()
            : undefined,

        source:
          typeof req.query.source === "string"
            ? (req.query.source as candidates_source)
            : undefined,
      };

      const result = await candidateService.getAllCandidates(query);

      ResponseFormatter.success(res, result, "ดึงรายการผู้สมัครสำเร็จ");
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
      const candidate = await candidateService.getCandidateById(req.params.id);

      ResponseFormatter.success(res, candidate, "ดึงข้อมูลผู้สมัครสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: UpdateCandidateDto = req.body;

      const candidate = await candidateService.updateCandidate(
        req.params.id,
        body,
      );

      ResponseFormatter.success(res, candidate, "แก้ไขข้อมูลผู้สมัครสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await candidateService.deleteCandidate(req.params.id);

      ResponseFormatter.success(res, null, "ลบข้อมูลผู้สมัครสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async createWithResume(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body: CreateCandidateWithResumeDto = {
        full_name: this.parseRequiredString(req.body.full_name, "full_name"),

        email: this.parseOptionalString(req.body.email),

        phone: this.parseOptionalString(req.body.phone),

        linkedin_url: this.parseOptionalString(req.body.linkedin_url),

        current_position: this.parseOptionalString(req.body.current_position),

        total_experience_years:
          req.body.total_experience_years !== undefined
            ? this.parseNonNegativeNumber(
                req.body.total_experience_years,
                "total_experience_years",
              )
            : undefined,

        source: req.body.source
          ? this.parseCandidateSource(req.body.source)
          : candidates_source.manual,

        source_url: this.parseOptionalString(req.body.source_url),

        job_id: req.body.job_id
          ? this.parseId(req.body.job_id, "job_id")
          : undefined,

        assigned_hr_id: req.user?.id ? BigInt(req.user.id) : undefined,
      };

      const result = await candidateService.createWithResume(body, req.file);

      ResponseFormatter.success(
        res,
        result,
        result.application
          ? "สร้างผู้สมัคร Resume และใบสมัครสำเร็จ"
          : result.resume
            ? "สร้างผู้สมัครและ Resume สำเร็จ"
            : "สร้างผู้สมัครสำเร็จ",
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  private parseRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || !value.trim()) {
      throw new AppError(`${fieldName} จำเป็นต้องระบุ`, 400);
    }

    return value.trim();
  }

  private parseOptionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const normalized = value.trim();

    return normalized || undefined;
  }

  private parseId(value: unknown, fieldName: string): bigint {
    const stringValue = String(value ?? "");

    if (!/^\d+$/.test(stringValue)) {
      throw new AppError(`${fieldName} ไม่ถูกต้อง`, 400);
    }

    const id = BigInt(stringValue);

    if (id <= 0n) {
      throw new AppError(`${fieldName} ไม่ถูกต้อง`, 400);
    }

    return id;
  }

  private parseNonNegativeNumber(value: unknown, fieldName: string): number {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new AppError(`${fieldName} ต้องไม่น้อยกว่า 0`, 400);
    }

    return numberValue;
  }

  private parseCandidateSource(value: unknown): candidates_source {
    const values = Object.values(candidates_source);

    if (
      typeof value !== "string" ||
      !values.includes(value as candidates_source)
    ) {
      throw new AppError("source ไม่ถูกต้อง", 400);
    }

    return value as candidates_source;
  }

  private parseNumber(value: unknown): number | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }
}
