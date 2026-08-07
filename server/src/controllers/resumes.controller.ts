import { NextFunction, Request, Response } from "express";
import path from "path";
import { ResumeService } from "@/services/resumes.service";
import { CreateResumeDto } from "@/types/resume.type";
import { ResponseFormatter } from "@/utils/response";
import { AppError } from "@/utils/app-error";

const resumeService = new ResumeService();

export class ResumeController {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError("กรุณาเลือกไฟล์ Resume", 400);
      }

      if (!req.params.candidateId || !/^\d+$/.test(req.params.candidateId)) {
        await resumeService.deleteUploadedFile(req.file.path);

        throw new AppError("รหัสผู้สมัครไม่ถูกต้อง", 400);
      }

      const isPrimary =
        req.body.is_primary === true || req.body.is_primary === "true";

      const fileUrl = `/uploads/resumes/${req.file.filename}`;

      const data: CreateResumeDto = {
        candidate_id: BigInt(req.params.candidateId),

        original_file_name: req.file.originalname,

        file_url: fileUrl,
        mime_type: req.file.mimetype,
        file_size: BigInt(req.file.size),
        is_primary: isPrimary,
      };

      try {
        const resume = await resumeService.createResume(data);

        ResponseFormatter.created(res, resume, "อัปโหลด Resume สำเร็จ");
      } catch (error) {
        await resumeService.deleteUploadedFile(req.file.path);

        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  async findByCandidate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await resumeService.getResumesByCandidateId(
        req.params.candidateId,
      );

      ResponseFormatter.success(res, result, "ดึงรายการ Resume สำเร็จ");
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
      const resume = await resumeService.getResumeById(req.params.id);

      ResponseFormatter.success(res, resume, "ดึงข้อมูล Resume สำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async setPrimary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const resume = await resumeService.setPrimaryResume(req.params.id);

      ResponseFormatter.success(res, resume, "กำหนด Resume หลักสำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await resumeService.deleteResume(req.params.id);

      ResponseFormatter.success(res, null, "ลบ Resume สำเร็จ");
    } catch (error) {
      next(error);
    }
  }
}
