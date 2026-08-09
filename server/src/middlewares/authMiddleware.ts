import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { logger } from "@/utils/logger";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: string;
      };
    }
  }
}

type TokenPayload = JwtPayload & {
  id: string;
  role?: string;
};

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

if (!REFRESH_SECRET) {
  throw new Error("REFRESH_SECRET is not configured");
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const cookieAccessToken = req.cookies?.accessToken;
    const authorization = req.headers.authorization;
    const bearerAccessToken =
      authorization?.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : undefined;

    const accessToken = cookieAccessToken ?? bearerAccessToken;

    if (!accessToken) {
      res.status(401).json({
        message: "No access token found",
      });
      return;
    }

    try {
      const decoded = jwt.verify(accessToken, JWT_SECRET) as TokenPayload;

      req.user = {
        id: decoded.id,
        role: decoded.role,
      };

      next();
      return;
    } catch {
      if (bearerAccessToken) {
        res.status(401).json({
          message: "Access token expired or invalid. Please login again.",
        });
        return;
      }

      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          message: "No refresh token found",
        });
        return;
      }

      try {
        const decodedRefresh = jwt.verify(
          refreshToken,
          REFRESH_SECRET,
        ) as TokenPayload;

        const newAccessToken = jwt.sign(
          {
            id: decodedRefresh.id,
            role: decodedRefresh.role,
          },
          JWT_SECRET,
          {
            expiresIn: "15m",
          },
        );

        res.cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 15 * 60 * 1000,
        });

        req.user = {
          id: decodedRefresh.id,
          role: decodedRefresh.role,
        };

        next();
        return;
      } catch (error) {
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict" as const,
        };

        res.clearCookie("accessToken", cookieOptions);
        res.clearCookie("refreshToken", cookieOptions);

        logger.error("Token refresh failed:", error);

        res.status(401).json({
          message: "Session expired, please login again",
        });
        return;
      }
    }
  } catch (error) {
    logger.error("Auth middleware error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};