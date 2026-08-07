import { NextFunction, Request, Response } from "express";
import { AIResumeService } from "@/services/ai-resumes.service";
import { ResponseFormatter } from "@/utils/response";

const aiResumeService = new AIResumeService();

export class AIResumeController {
  async parse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await aiResumeService.parseResume(req.params.resumeId);

      ResponseFormatter.success(res, result, "วิเคราะห์ Resume ด้วย AI สำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async getResult(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await aiResumeService.getResult(req.params.resumeId);

      ResponseFormatter.success(res, result, "ดึงผลวิเคราะห์ Resume สำเร็จ");
    } catch (error) {
      next(error);
    }
  }
}
