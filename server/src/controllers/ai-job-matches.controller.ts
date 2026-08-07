import { NextFunction, Request, Response } from "express";
import { AIJobMatchService } from "@/services/ai-job-matches.service";
import { ResponseFormatter } from "@/utils/response";

const aiJobMatchService = new AIJobMatchService();

export class AIJobMatchController {
  async analyze(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await aiJobMatchService.analyzeApplication(
        req.params.applicationId,
      );

      ResponseFormatter.success(
        res,
        result,
        "วิเคราะห์ความเหมาะสมของผู้สมัครสำเร็จ",
      );
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
      const result = await aiJobMatchService.getApplicationMatch(
        req.params.applicationId,
      );

      ResponseFormatter.success(res, result, "ดึงผลวิเคราะห์ความเหมาะสมสำเร็จ");
    } catch (error) {
      next(error);
    }
  }
}
