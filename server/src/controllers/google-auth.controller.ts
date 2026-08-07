import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { GoogleAuthService } from "@/services/google-auth.service";
import { AppError } from "@/utils/app-error";
import { ResponseFormatter } from "@/utils/response";

const googleAuthService = new GoogleAuthService();

export class GoogleAuthController {
  async getAuthUrl(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AppError("กรุณาเข้าสู่ระบบ", 401);
      }

     const authUrl =
  await googleAuthService.createAuthUrl(
    BigInt(req.user.id),
  );

      ResponseFormatter.success(
        res,
        {
          auth_url: authUrl,
        },
        "สร้าง Google authorization URL สำเร็จ",
        200,
      );
    } catch (error) {
      next(error);
    }
  }

  async callback(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const code =
        typeof req.query.code === "string"
          ? req.query.code
          : "";

      const state =
        typeof req.query.state === "string"
          ? req.query.state
          : "";

      await googleAuthService.handleCallback(code, state);

      const frontendUrl =
        process.env.FRONTEND_URL ??
        "http://localhost:5173";

      res.redirect(
        `${frontendUrl}/settings?google=connected`,
      );
    } catch (error) {
      next(error);
    }
  }

  async connection(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AppError("กรุณาเข้าสู่ระบบ", 401);
      }

      const result =
        await googleAuthService.getConnection(
          BigInt(req.user.id),
        );

      ResponseFormatter.success(
        res,
        result,
        "ดึงสถานะ Google connection สำเร็จ",
        200,
      );
    } catch (error) {
      next(error);
    }
  }

  async disconnect(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AppError("กรุณาเข้าสู่ระบบ", 401);
      }

      await googleAuthService.disconnect(
        BigInt(req.user.id),
      );

      ResponseFormatter.success(
        res,
        null,
        "ยกเลิกการเชื่อมต่อ Google สำเร็จ",
        200,
      );
    } catch (error) {
      next(error);
    }
  }
}