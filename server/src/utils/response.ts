import { Response } from "express";

export type ValidationErrors =
  | Record<string, string>
  | Record<string, string[]>
  | string[];

export interface ApiResponse<T = unknown> {
  success: boolean;
  status: number;
  message: string;
  data?: T;
  errors?: ValidationErrors;
  timestamp: string;
}

export class ResponseFormatter {
  static success<T>(
    res: Response,
    data: T,
    message = "Operation successful",
    statusCode = 200,
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      status: statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  static created<T>(
    res: Response,
    data: T,
    message = "Created successfully",
  ): Response {
    return this.success(res, data, message, 201);
  }

  static error(
    res: Response,
    message = "An error occurred",
    statusCode = 500,
    errors?: ValidationErrors,
  ): Response {
    const response: ApiResponse = {
      success: false,
      status: statusCode,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static notFound(res: Response, message = "Resource not found"): Response {
    return this.error(res, message, 404);
  }

  static validationError(
    res: Response,
    errors: ValidationErrors,
    message = "Validation failed",
  ): Response {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(
    res: Response,
    message = "Unauthorized access",
  ): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = "Forbidden"): Response {
    return this.error(res, message, 403);
  }

  static conflict(
    res: Response,
    message = "Resource already exists",
  ): Response {
    return this.error(res, message, 409);
  }

  static internal(res: Response, message = "Internal server error"): Response {
    return this.error(res, message, 500);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
