import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import multer from "multer";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { ResponseFormatter } from "@/utils/response";

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error("Application error:", error);

  if (error instanceof AppError) {
    ResponseFormatter.error(res, error.message, error.statusCode, error.errors);
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      ResponseFormatter.validationError(
        res,
        {
          resume: "ไฟล์ Resume ต้องมีขนาดไม่เกิน 10 MB",
        },
        "ไฟล์มีขนาดใหญ่เกินไป",
      );
      return;
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      ResponseFormatter.validationError(
        res,
        {
          resume:
            "ชื่อ field ของไฟล์ต้องเป็น resume และอัปโหลดได้ครั้งละ 1 ไฟล์",
        },
        "ข้อมูลไฟล์ไม่ถูกต้อง",
      );
      return;
    }

    ResponseFormatter.validationError(
      res,
      {
        resume: error.message,
      },
      "อัปโหลดไฟล์ไม่สำเร็จ",
    );
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        ResponseFormatter.conflict(res, "ข้อมูลนี้มีอยู่ในระบบแล้ว");
        return;

      case "P2003":
        ResponseFormatter.validationError(res, [
          "ไม่พบข้อมูลที่ถูกอ้างอิง หรือข้อมูลที่อ้างอิงไม่ถูกต้อง",
        ]);
        return;

      case "P2025":
        ResponseFormatter.notFound(res, "ไม่พบข้อมูลที่ต้องการ");
        return;

      case "P2028":
        ResponseFormatter.error(
          res,
          "การประมวลผลฐานข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง",
          503,
        );
        return;

      default:
        ResponseFormatter.internal(res, "เกิดข้อผิดพลาดในการทำงานกับฐานข้อมูล");
        return;
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    ResponseFormatter.error(res, "ไม่สามารถเชื่อมต่อฐานข้อมูลได้", 503);
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    ResponseFormatter.validationError(res, [
      "ข้อมูลที่ส่งไปยังฐานข้อมูลไม่ถูกต้อง",
    ]);
    return;
  }

  if (error instanceof Error) {
    ResponseFormatter.internal(
      res,
      process.env.NODE_ENV === "development"
        ? error.message
        : "Internal server error",
    );
    return;
  }

  ResponseFormatter.internal(res);
};
