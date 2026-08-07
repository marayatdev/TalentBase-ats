import { NextFunction, Request, Response } from "express";
import { pipeline_stages_stage_type } from "@/generated/prisma/client";
import { PipelineStageService } from "@/services/pipeline-stages.service";
import {
  CreatePipelineStageDto,
  ReorderPipelineStagesDto,
  UpdatePipelineStageDto,
} from "@/types/pipeline-stage.type";
import { AppError } from "@/utils/app-error";
import { ResponseFormatter } from "@/utils/response";

const pipelineStageService = new PipelineStageService();

export class PipelineStageController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: CreatePipelineStageDto = {
        job_id: this.parseBodyId(req.body.job_id, "job_id"),

        name: typeof req.body.name === "string" ? req.body.name : "",

        stage_order: this.parsePositiveInteger(
          req.body.stage_order,
          "stage_order",
        ),

        stage_type:
          req.body.stage_type !== undefined
            ? this.parseStageType(req.body.stage_type)
            : undefined,
      };

      const stage = await pipelineStageService.createStage(body);

      ResponseFormatter.created(res, stage, "สร้าง Pipeline Stage สำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async createDefault(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stages = await pipelineStageService.createDefaultPipeline(
        req.params.jobId,
      );

      ResponseFormatter.created(res, stages, "สร้าง Default Pipeline สำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async findByJob(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stages = await pipelineStageService.getStagesByJobId(
        req.params.jobId,
      );

      ResponseFormatter.success(res, stages, "ดึง Pipeline Stage สำเร็จ");
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
      const stage = await pipelineStageService.getStageById(req.params.id);

      ResponseFormatter.success(res, stage, "ดึงข้อมูล Pipeline Stage สำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: UpdatePipelineStageDto = {};

      if (req.body.name !== undefined) {
        if (typeof req.body.name !== "string") {
          throw new AppError("name ต้องเป็นข้อความ", 400);
        }

        body.name = req.body.name;
      }

      if (req.body.stage_order !== undefined) {
        body.stage_order = this.parsePositiveInteger(
          req.body.stage_order,
          "stage_order",
        );
      }

      if (req.body.stage_type !== undefined) {
        body.stage_type = this.parseStageType(req.body.stage_type);
      }

      const stage = await pipelineStageService.updateStage(req.params.id, body);

      ResponseFormatter.success(res, stage, "แก้ไข Pipeline Stage สำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async reorder(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!Array.isArray(req.body.stages)) {
        throw new AppError("stages ต้องเป็น array", 400);
      }

      const body: ReorderPipelineStagesDto = {
        stages: req.body.stages.map((item: unknown, index: number) => {
          if (typeof item !== "object" || item === null) {
            throw new AppError(
              `ข้อมูล stages ลำดับที่ ${index + 1} ไม่ถูกต้อง`,
              400,
            );
          }

          const stageItem = item as Record<string, unknown>;

          return {
            id: this.parseBodyId(stageItem.id, `stages[${index}].id`),

            stage_order: this.parsePositiveInteger(
              stageItem.stage_order,
              `stages[${index}].stage_order`,
            ),
          };
        }),
      };

      const stages = await pipelineStageService.reorderStages(
        req.params.jobId,
        body,
      );

      ResponseFormatter.success(res, stages, "จัดเรียง Pipeline Stage สำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await pipelineStageService.deleteStage(req.params.id);

      ResponseFormatter.success(res, null, "ลบ Pipeline Stage สำเร็จ");
    } catch (error) {
      next(error);
    }
  }

  private parseBodyId(value: unknown, fieldName: string): bigint {
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

  private parseStageType(value: unknown): pipeline_stages_stage_type {
    const allowedTypes = Object.values(pipeline_stages_stage_type);

    if (
      typeof value !== "string" ||
      !allowedTypes.includes(value as pipeline_stages_stage_type)
    ) {
      throw new AppError("stage_type ไม่ถูกต้อง", 400);
    }

    return value as pipeline_stages_stage_type;
  }
}
