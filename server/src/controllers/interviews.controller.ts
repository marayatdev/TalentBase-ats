import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { InterviewService } from "@/services/interviews.service";
import { AppError } from "@/utils/app-error";
import { ResponseFormatter } from "@/utils/response";

const interviewService =
  new InterviewService();

export class InterviewController {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AppError(
          "กรุณาเข้าสู่ระบบ",
          401,
        );
      }

      const result =
        await interviewService.create({
          application_id:
            this.parseId(
              req.body.application_id,
              "ใบสมัครงาน",
            ),

          scheduled_by:
            this.parseId(
              req.user.id,
              "ผู้ใช้งาน",
            ),

          title:
            this.parseRequiredString(
              req.body.title,
              "title",
            ),

          description:
            req.body.description === null
              ? null
              : this.parseOptionalString(
                  req.body.description,
                ),

          start_at:
            this.parseDate(
              req.body.start_at,
              "start_at",
            ),

          end_at:
            this.parseDate(
              req.body.end_at,
              "end_at",
            ),

          timezone:
            this.parseOptionalString(
              req.body.timezone,
            ) ??
            "Asia/Bangkok",

          interviewer_emails:
            this.parseEmails(
              req.body.interviewer_emails,
            ),
        });

      ResponseFormatter.success(
        res,
        result,
        "สร้างนัดสัมภาษณ์และ Google Meet สำเร็จ",
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async update(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AppError(
          "กรุณาเข้าสู่ระบบ",
          401,
        );
      }

      const result =
        await interviewService.update(
          this.parseId(
            req.params.id,
            "นัดสัมภาษณ์",
          ),

          this.parseId(
            req.user.id,
            "ผู้ใช้งาน",
          ),

          {
            title:
              this.parseOptionalString(
                req.body.title,
              ),

            description:
              req.body.description === null
                ? null
                : this.parseOptionalString(
                    req.body.description,
                  ),

            start_at:
              this.parseDate(
                req.body.start_at,
                "start_at",
              ),

            end_at:
              this.parseDate(
                req.body.end_at,
                "end_at",
              ),

            timezone:
              this.parseOptionalString(
                req.body.timezone,
              ) ??
              "Asia/Bangkok",

            interviewer_emails:
              this.parseEmails(
                req.body.interviewer_emails,
              ),
          },
        );

      ResponseFormatter.success(
        res,
        result,
        "เปลี่ยนเวลานัดสัมภาษณ์สำเร็จ",
        200,
      );
    } catch (error) {
      next(error);
    }
  }

  async cancel(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AppError(
          "กรุณาเข้าสู่ระบบ",
          401,
        );
      }

      const result =
        await interviewService.cancel(
          this.parseId(
            req.params.id,
            "นัดสัมภาษณ์",
          ),

          this.parseId(
            req.user.id,
            "ผู้ใช้งาน",
          ),
        );

      ResponseFormatter.success(
        res,
        result,
        "ยกเลิกนัดสัมภาษณ์สำเร็จ",
        200,
      );
    } catch (error) {
      next(error);
    }
  }

  async findByApplicationId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const interviews =
        await interviewService.findByApplicationId(
          this.parseId(
            req.params.applicationId,
            "ใบสมัครงาน",
          ),
        );

      ResponseFormatter.success(
        res,
        {
          interviews,
        },
        "ดึงรายการนัดสัมภาษณ์สำเร็จ",
        200,
      );
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
      const interview =
        await interviewService.findOne(
          this.parseId(
            req.params.id,
            "นัดสัมภาษณ์",
          ),
        );

      ResponseFormatter.success(
        res,
        interview,
        "ดึงข้อมูลนัดสัมภาษณ์สำเร็จ",
        200,
      );
    } catch (error) {
      next(error);
    }
  }

  private parseId(
    value: unknown,
    entity: string,
  ): bigint {
    const normalized =
      String(value ?? "").trim();

    if (!/^\d+$/.test(normalized)) {
      throw new AppError(
        `รหัส${entity}ไม่ถูกต้อง`,
        400,
      );
    }

    const id =
      BigInt(normalized);

    if (id <= 0n) {
      throw new AppError(
        `รหัส${entity}ไม่ถูกต้อง`,
        400,
      );
    }

    return id;
  }

  private parseDate(
    value: unknown,
    fieldName: string,
  ): Date {
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      throw new AppError(
        `กรุณาระบุ ${fieldName}`,
        400,
      );
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      throw new AppError(
        `${fieldName} ไม่ใช่วันที่และเวลาที่ถูกต้อง`,
        400,
      );
    }

    return date;
  }

  private parseRequiredString(
    value: unknown,
    fieldName: string,
  ): string {
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      throw new AppError(
        `กรุณาระบุ ${fieldName}`,
        400,
      );
    }

    return value.trim();
  }

  private parseOptionalString(
    value: unknown,
  ): string | undefined {
    if (
      typeof value !== "string"
    ) {
      return undefined;
    }

    const normalized =
      value.trim();

    return normalized ||
      undefined;
  }

  private parseEmails(
    value: unknown,
  ): string[] {
    if (!Array.isArray(value)) {
      throw new AppError(
        "interviewer_emails ต้องเป็น array",
        400,
      );
    }

    const emails =
      value
        .filter(
          (
            item,
          ): item is string =>
            typeof item === "string",
        )
        .map((email) =>
          email.trim(),
        )
        .filter(Boolean);

    if (emails.length === 0) {
      throw new AppError(
        "กรุณาระบุผู้สัมภาษณ์อย่างน้อย 1 คน",
        400,
      );
    }

    return emails;
  }
}