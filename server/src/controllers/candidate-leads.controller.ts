import type { NextFunction, Request, Response } from "express";
import {
  candidate_leads_source,
  candidate_leads_status,
} from "@/generated/prisma/client";
import { AppError } from "@/utils/app-error";
import { ResponseFormatter } from "@/utils/response";

const candidateLeadService = new CandidateLeadService();

export class CandidateLeadController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const source = this.parseSource(req.body.source);

      const result = await candidateLeadService.create({
        source,
        source_url:
          typeof req.body.source_url === "string" ? req.body.source_url : null,

        raw_text: String(req.body.raw_text ?? ""),

        detected_name:
          typeof req.body.detected_name === "string"
            ? req.body.detected_name
            : null,

        detected_email:
          typeof req.body.detected_email === "string"
            ? req.body.detected_email
            : null,

        detected_phone:
          typeof req.body.detected_phone === "string"
            ? req.body.detected_phone
            : null,

        detected_position:
          typeof req.body.detected_position === "string"
            ? req.body.detected_position
            : null,

        skills: Array.isArray(req.body.skills)
          ? req.body.skills.filter(
            (value: unknown): value is string => typeof value === "string",
          )
          : [],

        ai_confidence:
          req.body.ai_confidence === undefined ||
            req.body.ai_confidence === null
            ? null
            : Number(req.body.ai_confidence),

        ai_reason:
          typeof req.body.ai_reason === "string" ? req.body.ai_reason : null,

        target_job_id: req.body.target_job_id
          ? this.parseId(req.body.target_job_id)
          : null,
      });

      ResponseFormatter.success(
        res,
        result,
        "บันทึก Candidate Lead สำเร็จ",
        201,
      );
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
      const result = await candidateLeadService.findAll({
        page: req.query.page ? Number(req.query.page) : undefined,

        limit: req.query.limit ? Number(req.query.limit) : undefined,

        search:
          typeof req.query.search === "string" ? req.query.search : undefined,

        source:
          typeof req.query.source === "string"
            ? this.parseSource(req.query.source)
            : undefined,

        status:
          typeof req.query.status === "string"
            ? this.parseStatus(req.query.status)
            : undefined,

        target_job_id:
          typeof req.query.target_job_id === "string"
            ? this.parseId(req.query.target_job_id)
            : undefined,
      });

      ResponseFormatter.success(res, result, "ดึง Candidate Leads สำเร็จ", 200);
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
      const result = await candidateLeadService.findOne(
        this.parseId(req.params.id),
      );

      ResponseFormatter.success(res, result, "ดึง Candidate Lead สำเร็จ", 200);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leadId = this.parseId(req.params.id);

      const result = await candidateLeadService.update(leadId, {
        detected_name:
          req.body.detected_name === null
            ? null
            : this.parseOptionalString(req.body.detected_name),

        detected_email:
          req.body.detected_email === null
            ? null
            : this.parseOptionalString(req.body.detected_email),

        detected_phone:
          req.body.detected_phone === null
            ? null
            : this.parseOptionalString(req.body.detected_phone),

        detected_position:
          req.body.detected_position === null
            ? null
            : this.parseOptionalString(req.body.detected_position),

        skills:
          req.body.skills === undefined
            ? undefined
            : this.parseSkills(req.body.skills),

        target_job_id:
          req.body.target_job_id === undefined
            ? undefined
            : req.body.target_job_id === null
              ? null
              : this.parseId(req.body.target_job_id),

        status:
          req.body.status === undefined
            ? undefined
            : this.parseStatus(req.body.status),

        /*
         * ถ้ามี Auth middleware แนะนำใช้ req.user.id
         */
        reviewed_by: req.user?.id ? BigInt(req.user.id) : null,
      });

      ResponseFormatter.success(
        res,
        result,
        "อัปเดต Candidate Lead สำเร็จ",
        200,
      );
    } catch (error) {
      next(error);
    }
  }

  async convert(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const leadId = this.parseId(req.params.id);

      const result = await candidateLeadService.convert(leadId, {
        full_name: this.parseOptionalString(req.body.full_name),

        email:
          req.body.email === null
            ? null
            : this.parseOptionalString(req.body.email),

        phone:
          req.body.phone === null
            ? null
            : this.parseOptionalString(req.body.phone),

        linkedin_url:
          req.body.linkedin_url === null
            ? null
            : this.parseOptionalString(req.body.linkedin_url),

        current_position:
          req.body.current_position === null
            ? null
            : this.parseOptionalString(req.body.current_position),

        total_experience_years:
          req.body.total_experience_years === undefined
            ? undefined
            : this.parseNonNegativeNumber(
              req.body.total_experience_years,
              "total_experience_years",
            ),

        job_id:
          req.body.job_id === undefined
            ? undefined
            : req.body.job_id === null
              ? null
              : this.parseId(req.body.job_id),

        assigned_hr_id: req.user?.id ? BigInt(req.user.id) : null,

        create_application:
          req.body.create_application === undefined
            ? undefined
            : Boolean(req.body.create_application),
      });

      ResponseFormatter.success(
        res,
        result,
        "Convert Candidate Lead สำเร็จ",
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  private parseOptionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const normalized = value.trim();

    return normalized || undefined;
  }

  private parseSkills(value: unknown): string[] {
    if (!Array.isArray(value)) {
      throw new AppError("skills ต้องเป็น array", 400);
    }

    return value
      .filter((skill): skill is string => typeof skill === "string")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  private parseNonNegativeNumber(value: unknown, fieldName: string): number {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new AppError(`${fieldName} ต้องไม่น้อยกว่า 0`, 400);
    }

    return numberValue;
  }

  private parseId(value: unknown): bigint {
    const normalized = String(value ?? "");

    if (!/^\d+$/.test(normalized)) {
      throw new AppError("รหัสไม่ถูกต้อง", 400);
    }

    const id = BigInt(normalized);

    if (id <= 0n) {
      throw new AppError("รหัสไม่ถูกต้อง", 400);
    }

    return id;
  }

  private parseSource(value: unknown): candidate_leads_source {
    const normalized = typeof value === "string" ? value : "facebook";

    if (
      !Object.values(candidate_leads_source).includes(
        normalized as candidate_leads_source,
      )
    ) {
      throw new AppError("source ไม่ถูกต้อง", 400);
    }

    return normalized as candidate_leads_source;
  }

  private parseStatus(value: unknown): candidate_leads_status {
    if (
      typeof value !== "string" ||
      !Object.values(candidate_leads_status).includes(
        value as candidate_leads_status,
      )
    ) {
      throw new AppError("status ไม่ถูกต้อง", 400);
    }

    return value as candidate_leads_status;
  }
}
