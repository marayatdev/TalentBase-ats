import { NextFunction, Request, Response } from "express";
import { CandidateImportParserService } from "@/services/candidate-import-parser.service";
import { CandidateImportService } from "@/services/candidate-imports.service";
import {
  GetImportHistoryQuery,
  ManualCandidateImportDto,
  ParseCandidateTextDto,
} from "@/types/candidate-import.type";
import {
  candidate_imports_import_status,
  candidate_imports_source,
} from "@/generated/prisma/client";
import { AppError } from "@/utils/app-error";
import { ResponseFormatter } from "@/utils/response";
import { CandidatePostAnalyzerService } from "@/services/candidate-post-analyzer.service";

const candidateImportParserService = new CandidateImportParserService();

const candidateImportService = new CandidateImportService();

export class CandidateImportController {
  async history(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page =
        req.query.page !== undefined
          ? this.parsePositiveInteger(req.query.page, "page")
          : undefined;

      const limit =
        req.query.limit !== undefined
          ? this.parsePositiveInteger(req.query.limit, "limit")
          : undefined;

      const source =
        req.query.source !== undefined
          ? this.parseSource(req.query.source)
          : undefined;

      const importStatus =
        req.query.import_status !== undefined
          ? this.parseImportStatus(req.query.import_status)
          : undefined;

      const query: GetImportHistoryQuery = {
        page,
        limit,
        source,
        import_status: importStatus,
      };

      const result = await candidateImportService.getHistory(query);

      ResponseFormatter.success(
        res,
        result,
        "ดึงประวัติการนำเข้าผู้สมัครสำเร็จ",
      );
    } catch (error) {
      next(error);
    }
  }

  async parseText(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (typeof req.body.raw_text !== "string") {
        throw new AppError("raw_text ต้องเป็นข้อความ", 400);
      }

      const body: ParseCandidateTextDto = {
        raw_text: req.body.raw_text,

        source:
          req.body.source !== undefined
            ? this.parseSource(req.body.source)
            : undefined,

        source_url:
          typeof req.body.source_url === "string"
            ? req.body.source_url
            : undefined,
      };

      const result = await candidateImportParserService.parseText(body);

      ResponseFormatter.success(res, result, "วิเคราะห์ข้อมูลผู้สมัครสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async importManual(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (typeof req.body.full_name !== "string") {
        throw new AppError("full_name ต้องเป็นข้อความ", 400);
      }

      const body: ManualCandidateImportDto = {
        full_name: req.body.full_name,

        email: typeof req.body.email === "string" ? req.body.email : undefined,

        phone: typeof req.body.phone === "string" ? req.body.phone : undefined,

        current_position:
          typeof req.body.current_position === "string"
            ? req.body.current_position
            : undefined,

        source: this.parseSource(req.body.source),

        source_url:
          typeof req.body.source_url === "string"
            ? req.body.source_url
            : undefined,

        raw_text:
          typeof req.body.raw_text === "string" ? req.body.raw_text : undefined,

        job_id: this.parseId(req.body.job_id, "job_id"),

        imported_by: req.user?.id ? BigInt(req.user.id) : undefined,
      };

      const result = await candidateImportService.importManual(body);

      ResponseFormatter.created(
        res,
        result,
        result.is_duplicate
          ? "พบผู้สมัครเดิมและเชื่อมกับข้อมูลในระบบแล้ว"
          : "นำเข้าผู้สมัครสำเร็จ",
      );
    } catch (error) {
      next(error);
    }
  }

  async analyzePost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const candidatePostAnalyzerService =
      new CandidatePostAnalyzerService();

    const jobId =
      req.body.job_id === undefined ||
      req.body.job_id === null
        ? ""
        : String(req.body.job_id).trim();

    const result =
      await candidatePostAnalyzerService.analyze({
        raw_text:
          String(
            req.body.raw_text ?? "",
          ),

        source:
          req.body.source ??
          "facebook",

        source_url:
          typeof req.body.source_url ===
          "string"
            ? req.body.source_url
            : undefined,

        job_id:
          jobId,

        /*
         * เก็บไว้รองรับ client รุ่นเก่า
         * แต่ Service ใหม่จะใช้ Job จาก job_id เป็นหลัก
         */
        target_position:
          typeof req.body.target_position ===
          "string"
            ? req.body.target_position
            : undefined,
      });

    ResponseFormatter.success(
      res,
      result,
      "วิเคราะห์โพสต์ด้วย AI สำเร็จ",
      200,
    );
  } catch (error) {
    next(error);
  }
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

  private parsePositiveInteger(value: unknown, fieldName: string): number {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 1) {
      throw new AppError(`${fieldName} ต้องเป็นจำนวนเต็มที่มากกว่า 0`, 400);
    }

    return numberValue;
  }

  private parseSource(value: unknown): candidate_imports_source {
    const values = Object.values(candidate_imports_source);

    if (
      typeof value !== "string" ||
      !values.includes(value as candidate_imports_source)
    ) {
      throw new AppError("source ไม่ถูกต้อง", 400);
    }

    return value as candidate_imports_source;
  }

  private parseImportStatus(value: unknown): candidate_imports_import_status {
    const values = Object.values(candidate_imports_import_status);

    if (
      typeof value !== "string" ||
      !values.includes(value as candidate_imports_import_status)
    ) {
      throw new AppError("import_status ไม่ถูกต้อง", 400);
    }

    return value as candidate_imports_import_status;
  }
}
