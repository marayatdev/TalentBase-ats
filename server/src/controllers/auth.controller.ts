import { Request, Response } from "express";
import { AuthService } from "@/services/auth.service";
import { logger } from "@/utils/logger";
import { TypedRequestBody } from "@/utils/request";
import { User } from "@/types/auth";
import { ResponseFormatter } from "@/utils/response";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";

export class AuthController {
  private authService: AuthService;

  private jwtSecret: string;

  private refreshSecret: string;

  private readonly isProduction =
    process.env.NODE_ENV === "production";

  private generateAccessToken = (
    user: User,
  ) => {
    return jwt.sign(
      {
        id: user.id.toString(),
        role: user.role,
      },
      this.jwtSecret,
      {
        expiresIn: "7d",
      },
    );
  };

  private generateRefreshToken = (
    user: User,
  ) => {
    return jwt.sign(
      {
        id: user.id.toString(),
        role: user.role,
      },
      this.refreshSecret,
      {
        expiresIn: "7d",
      },
    );
  };

  constructor() {
    this.authService =
      new AuthService();

    this.jwtSecret =
      process.env.JWT_SECRET ||
      "bovhoeivfoebwfvbeifpwbqe";

    this.refreshSecret =
      process.env.REFRESH_SECRET ||
      "bovhoeivfoebwfvbeifpwbqe";
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken?: string,
  ): void {
    res.cookie(
      "accessToken",
      accessToken,
      {
        httpOnly: true,

        secure:
          this.isProduction,

        sameSite:
          this.isProduction
            ? "none"
            : "lax",

        path: "/",

        maxAge:
          7 *
          24 *
          60 *
          60 *
          1000,
      },
    );

    if (refreshToken) {
      res.cookie(
        "refreshToken",
        refreshToken,
        {
          httpOnly: true,

          secure:
            this.isProduction,

          sameSite:
            this.isProduction
              ? "none"
              : "lax",

          path: "/",

          maxAge:
            7 *
            24 *
            60 *
            60 *
            1000,
        },
      );
    }
  }

  private clearAuthCookies(
    res: Response,
  ): void {
    const options = {
      httpOnly: true,

      secure:
        this.isProduction,

      sameSite:
        this.isProduction
          ? ("none" as const)
          : ("lax" as const),

      path: "/",
    };

    res.clearCookie(
      "accessToken",
      options,
    );

    res.clearCookie(
      "refreshToken",
      options,
    );
  }

  public register = async (
    req: TypedRequestBody<User>,
    res: Response,
  ) => {
    try {
      const data: User =
        req.body;

      if (
        !data.name ||
        !data.email ||
        !data.password
      ) {
        ResponseFormatter.notFound(
          res,
          "Missing required fields",
        );

        return;
      }

      const existingUser =
        await this.authService.getUserByEmail(
          data.email,
        );

      if (existingUser) {
        ResponseFormatter.validationError(
          res,
          {
            email:
              "Email already exists",
          },
        );

        return;
      }

      const hashedPassword =
        await argon2.hash(
          data.password,
        );

      const newUser = {
        ...data,
        password:
          hashedPassword,
      };

      const user =
        await this.authService.registerUser(
          newUser,
        );

      if (!user) {
        ResponseFormatter.validationError(
          res,
          {
            email:
              "User creation failed",
          },
        );

        return;
      }

      const accessToken =
        this.generateAccessToken(
          user,
        );

      const refreshToken =
        this.generateRefreshToken(
          user,
        );

      this.setAuthCookies(
        res,
        accessToken,
        refreshToken,
      );

      ResponseFormatter.success(
        res,
        "User created successfully",
      );
    } catch (err) {
      logger.error(
        "Create user failed:",
        err,
      );

      res.status(500).json({
        message:
          "Internal server error",
      });
    }
  };

  public login = async (
    req: TypedRequestBody<User>,
    res: Response,
  ) => {
    try {
      const data: User =
        req.body;

      if (
        !data.email ||
        !data.password
      ) {
        ResponseFormatter.notFound(
          res,
          "Missing required fields",
        );

        return;
      }

      const user =
        await this.authService.getUserByEmail(
          data.email,
        );

      if (!user) {
        ResponseFormatter.validationError(
          res,
          {
            email:
              "Invalid credentials",
          },
        );

        return;
      }

      const isPasswordValid =
        await argon2.verify(
          user.password,
          data.password,
        );

      if (
        !isPasswordValid
      ) {
        ResponseFormatter.validationError(
          res,
          {
            email:
              "Invalid credentials",
          },
        );

        return;
      }

      const accessToken =
        this.generateAccessToken(
          user,
        );

      const refreshToken =
        this.generateRefreshToken(
          user,
        );

      this.setAuthCookies(
        res,
        accessToken,
        refreshToken,
      );

      ResponseFormatter.success(
        res,
        "Login successful",
      );
    } catch (err) {
      logger.error(
        "Login failed:",
        err,
      );

      res.status(500).json({
        message:
          "Internal server error",
      });
    }
  };

  public refresh = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const token =
        req.cookies.refreshToken;

      if (!token) {
        res.status(401).json({
          message:
            "No refresh token",
        });

        return;
      }

      const payload =
        jwt.verify(
          token,
          this.refreshSecret,
        ) as {
          id: string;
        };

      const user =
        await this.authService.getUserById(
          payload.id,
        );

      if (!user) {
        res.status(401).json({
          message:
            "Invalid refresh token",
        });

        return;
      }

      const newAccessToken =
        this.generateAccessToken(
          user,
        );

      this.setAuthCookies(
        res,
        newAccessToken,
      );

      ResponseFormatter.success(
        res,
        {
          accessToken:
            newAccessToken,
        },
        "Token refreshed",
      );
    } catch (err) {
      this.clearAuthCookies(
        res,
      );

      logger.error(
        "Token refresh failed:",
        err,
      );

      res.status(401).json({
        message:
          "Session expired",
      });

      return;
    }
  };

  public logout = async (
    _req: Request,
    res: Response,
  ) => {
    try {
      this.clearAuthCookies(
        res,
      );

      res.status(200).json({
        message:
          "Logged out successfully",
      });

      return;
    } catch (err) {
      console.error(
        "Logout error:",
        err,
      );

      res.status(500).json({
        message:
          "Logout failed",
      });

      return;
    }
  };

  public me = async (
    req: Request,
    res: Response,
  ) => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message:
            "Unauthorized",
        });

        return;
      }

      const user =
        await this.authService.getUserById(
          req.user.id,
        );

      if (!user) {
        res.status(404).json({
          message:
            "User not found",
        });

        return;
      }

      const safeUser = {
        id:
          user.id.toString(),

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        isActive:
          user.is_active === 1,

        createdAt:
          user.created_at,

        updatedAt:
          user.updated_at,
      };

      ResponseFormatter.success(
        res,
        safeUser,
        "User fetched successfully",
      );
    } catch (err) {
      logger.error(
        "Fetch user failed:",
        err,
      );

      res.status(500).json({
        message:
          "Internal server error",
      });
    }
  };

  public extensionLogin = async (
    req: TypedRequestBody<User>,
    res: Response,
  ) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
        return;
      }

      const user =
        await this.authService.getUserByEmail(email);

      if (!user) {
        res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
        return;
      }

      const valid =
        await argon2.verify(
          user.password,
          password,
        );

      if (!valid) {
        res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
        return;
      }

      const accessToken =
        this.generateAccessToken(user);

      res.status(200).json({
        success: true,
        data: {
          accessToken,

          user: {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      logger.error(
        "Extension login failed:",
        error,
      );

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}