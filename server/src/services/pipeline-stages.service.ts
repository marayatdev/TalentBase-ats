import { prisma } from "@/config/db";
import { pipeline_stages_stage_type, Prisma } from "@/generated/prisma/client";
import {
  CreatePipelineStageDto,
  ReorderPipelineStagesDto,
  UpdatePipelineStageDto,
} from "@/types/pipeline-stage.type";
import { AppError } from "@/utils/app-error";

export class PipelineStageService {
  async createStage(data: CreatePipelineStageDto) {
    const name = data.name?.trim();

    if (!name) {
      throw new AppError("กรุณาระบุชื่อ Pipeline Stage", 400);
    }

    if (!Number.isInteger(data.stage_order) || data.stage_order < 1) {
      throw new AppError("ลำดับ Stage ต้องเป็นจำนวนเต็มที่มากกว่า 0", 400);
    }

    const job = await prisma.jobs.findUnique({
      where: {
        id: data.job_id,
      },
      select: {
        id: true,
      },
    });

    if (!job) {
      throw new AppError("ไม่พบตำแหน่งงาน", 404);
    }

    const duplicateName = await prisma.pipeline_stages.findFirst({
      where: {
        job_id: data.job_id,
        name,
      },
      select: {
        id: true,
      },
    });

    if (duplicateName) {
      throw new AppError("มี Stage ชื่อนี้ในตำแหน่งงานแล้ว", 409);
    }

    const duplicateOrder = await prisma.pipeline_stages.findFirst({
      where: {
        job_id: data.job_id,
        stage_order: data.stage_order,
      },
      select: {
        id: true,
      },
    });

    if (duplicateOrder) {
      throw new AppError("ลำดับ Stage นี้ถูกใช้งานแล้ว", 409);
    }

    return prisma.pipeline_stages.create({
      data: {
        job_id: data.job_id,
        name,
        stage_order: data.stage_order,
        stage_type: data.stage_type ?? pipeline_stages_stage_type.active,
      },
    });
  }

  async createDefaultPipeline(jobIdValue: string) {
    const jobId = this.parseId(jobIdValue, "ตำแหน่งงาน");

    const job = await prisma.jobs.findUnique({
      where: {
        id: jobId,
      },
      select: {
        id: true,
        pipeline_stages: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!job) {
      throw new AppError("ไม่พบตำแหน่งงาน", 404);
    }

    if (job.pipeline_stages.length > 0) {
      throw new AppError("ตำแหน่งงานนี้มี Pipeline อยู่แล้ว", 409);
    }

    const defaultStages: Array<{
      name: string;
      stage_order: number;
      stage_type: pipeline_stages_stage_type;
    }> = [
      {
        name: "New Applicant",
        stage_order: 1,
        stage_type: pipeline_stages_stage_type.active,
      },
      {
        name: "AI Screening",
        stage_order: 2,
        stage_type: pipeline_stages_stage_type.active,
      },
      {
        name: "HR Screening",
        stage_order: 3,
        stage_type: pipeline_stages_stage_type.active,
      },
      {
        name: "Technical Interview",
        stage_order: 4,
        stage_type: pipeline_stages_stage_type.active,
      },
      {
        name: "Offer",
        stage_order: 5,
        stage_type: pipeline_stages_stage_type.active,
      },
      {
        name: "Hired",
        stage_order: 6,
        stage_type: pipeline_stages_stage_type.hired,
      },
      {
        name: "Rejected",
        stage_order: 7,
        stage_type: pipeline_stages_stage_type.rejected,
      },
    ];

    await prisma.pipeline_stages.createMany({
      data: defaultStages.map((stage) => ({
        job_id: jobId,
        ...stage,
      })),
    });

    return this.getStagesByJobId(jobIdValue);
  }

  async getStagesByJobId(jobIdValue: string) {
    const jobId = this.parseId(jobIdValue, "ตำแหน่งงาน");

    const job = await prisma.jobs.findUnique({
      where: {
        id: jobId,
      },
      select: {
        id: true,
      },
    });

    if (!job) {
      throw new AppError("ไม่พบตำแหน่งงาน", 404);
    }

    return prisma.pipeline_stages.findMany({
      where: {
        job_id: jobId,
      },
      orderBy: {
        stage_order: "asc",
      },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });
  }

  async getStageById(idValue: string) {
    const stageId = this.parseId(idValue, "Pipeline Stage");

    const stage = await prisma.pipeline_stages.findUnique({
      where: {
        id: stageId,
      },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!stage) {
      throw new AppError("ไม่พบ Pipeline Stage", 404);
    }

    return stage;
  }

  async updateStage(idValue: string, data: UpdatePipelineStageDto) {
    const stageId = this.parseId(idValue, "Pipeline Stage");

    const existingStage = await prisma.pipeline_stages.findUnique({
      where: {
        id: stageId,
      },
    });

    if (!existingStage) {
      throw new AppError("ไม่พบ Pipeline Stage", 404);
    }

    const name = data.name !== undefined ? data.name.trim() : undefined;

    if (data.name !== undefined && !name) {
      throw new AppError("ชื่อ Pipeline Stage ต้องไม่เป็นค่าว่าง", 400);
    }

    if (
      data.stage_order !== undefined &&
      (!Number.isInteger(data.stage_order) || data.stage_order < 1)
    ) {
      throw new AppError("ลำดับ Stage ต้องเป็นจำนวนเต็มที่มากกว่า 0", 400);
    }

    if (name) {
      const duplicateName = await prisma.pipeline_stages.findFirst({
        where: {
          job_id: existingStage.job_id,
          name,
          id: {
            not: stageId,
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicateName) {
        throw new AppError("มี Stage ชื่อนี้ในตำแหน่งงานแล้ว", 409);
      }
    }

    /*
     * การเปลี่ยนลำดับหลาย Stage
     * ควรใช้ reorderStages() แทน
     */
    if (
      data.stage_order !== undefined &&
      data.stage_order !== existingStage.stage_order
    ) {
      const duplicateOrder = await prisma.pipeline_stages.findFirst({
        where: {
          job_id: existingStage.job_id,
          stage_order: data.stage_order,
          id: {
            not: stageId,
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicateOrder) {
        throw new AppError(
          "ลำดับนี้ถูกใช้โดย Stage อื่น กรุณาใช้ Reorder Pipeline",
          409,
        );
      }
    }

    return prisma.pipeline_stages.update({
      where: {
        id: stageId,
      },
      data: {
        name,
        stage_order: data.stage_order,
        stage_type: data.stage_type,
      },
    });
  }

  async reorderStages(jobIdValue: string, data: ReorderPipelineStagesDto) {
    const jobId = this.parseId(jobIdValue, "ตำแหน่งงาน");

    if (!Array.isArray(data.stages) || data.stages.length === 0) {
      throw new AppError("กรุณาระบุรายการ Stage ที่ต้องการจัดเรียง", 400);
    }

    const databaseStages = await prisma.pipeline_stages.findMany({
      where: {
        job_id: jobId,
      },
      select: {
        id: true,
        stage_order: true,
      },
      orderBy: {
        stage_order: "asc",
      },
    });

    if (databaseStages.length === 0) {
      throw new AppError("ตำแหน่งงานนี้ยังไม่มี Pipeline Stage", 404);
    }

    /*
     * Frontend ต้องส่ง Stage มาครบทุกตัวของ Job
     * เพื่อป้องกันลำดับซ้ำหรือมีช่องว่าง
     */
    if (data.stages.length !== databaseStages.length) {
      throw new AppError("ต้องส่ง Stage ให้ครบทุก Stage ของตำแหน่งงาน", 400);
    }

    const databaseStageIds = new Set(
      databaseStages.map((stage) => stage.id.toString()),
    );

    const requestStageIds = new Set<string>();
    const requestOrders = new Set<number>();

    for (const stage of data.stages) {
      const stageId = stage.id.toString();

      if (!databaseStageIds.has(stageId)) {
        throw new AppError(
          `Stage ID ${stageId} ไม่ได้อยู่ในตำแหน่งงานนี้`,
          400,
        );
      }

      if (requestStageIds.has(stageId)) {
        throw new AppError(`พบ Stage ID ${stageId} ซ้ำ`, 400);
      }

      if (!Number.isInteger(stage.stage_order) || stage.stage_order < 1) {
        throw new AppError("stage_order ต้องเป็นจำนวนเต็มที่มากกว่า 0", 400);
      }

      if (requestOrders.has(stage.stage_order)) {
        throw new AppError(`พบลำดับ ${stage.stage_order} ซ้ำ`, 400);
      }

      requestStageIds.add(stageId);

      requestOrders.add(stage.stage_order);
    }

    /*
     * บังคับให้ลำดับเป็น 1, 2, 3, ... N
     */
    const sortedOrders = Array.from(requestOrders).sort((a, b) => a - b);

    const expectedOrders = Array.from(
      {
        length: databaseStages.length,
      },
      (_, index) => index + 1,
    );

    const orderIsValid = sortedOrders.every(
      (order, index) => order === expectedOrders[index],
    );

    if (!orderIsValid) {
      throw new AppError(
        `ลำดับ Stage ต้องเรียงต่อกันตั้งแต่ 1 ถึง ${databaseStages.length}`,
        400,
      );
    }

    return prisma.$transaction(
      async (transaction) => {
        /*
         * ขั้นที่ 1:
         * ย้ายทุก Stage ไปเลขชั่วคราว
         *
         * ตัวอย่าง 1,2,3
         * จะกลายเป็น 100001,100002,100003
         *
         * เพื่อหลีกเลี่ยง unique constraint
         */
        await transaction.pipeline_stages.updateMany({
          where: {
            job_id: jobId,
          },
          data: {
            stage_order: {
              increment: 100_000,
            },
          },
        });

        /*
         * ขั้นที่ 2:
         * กำหนดลำดับจริงใหม่
         */
        for (const stage of data.stages) {
          await transaction.pipeline_stages.update({
            where: {
              id: stage.id,
            },
            data: {
              stage_order: stage.stage_order,
            },
          });
        }

        return transaction.pipeline_stages.findMany({
          where: {
            job_id: jobId,
          },
          orderBy: {
            stage_order: "asc",
          },
          include: {
            _count: {
              select: {
                applications: true,
              },
            },
          },
        });
      },
      {
        maxWait: 5_000,
        timeout: 15_000,
      },
    );
  }

  async deleteStage(idValue: string): Promise<void> {
    const stageId = this.parseId(idValue, "Pipeline Stage");

    const stage = await prisma.pipeline_stages.findUnique({
      where: {
        id: stageId,
      },
      select: {
        id: true,
        job_id: true,
        stage_order: true,
        _count: {
          select: {
            applications: true,
            application_stage_histories_application_stage_histories_from_stage_idTopipeline_stages:
              true,
            application_stage_histories_application_stage_histories_to_stage_idTopipeline_stages:
              true,
          },
        },
      },
    });

    if (!stage) {
      throw new AppError("ไม่พบ Pipeline Stage", 404);
    }

    if (stage._count.applications > 0) {
      throw new AppError("ไม่สามารถลบ Stage ที่ยังมีผู้สมัครอยู่ได้", 409);
    }

    const historyCount =
      stage._count
        .application_stage_histories_application_stage_histories_from_stage_idTopipeline_stages +
      stage._count
        .application_stage_histories_application_stage_histories_to_stage_idTopipeline_stages;

    if (historyCount > 0) {
      throw new AppError("ไม่สามารถลบ Stage ที่มีประวัติการใช้งานได้", 409);
    }

    await prisma.$transaction(
      async (transaction) => {
        await transaction.pipeline_stages.delete({
          where: {
            id: stageId,
          },
        });

        /*
         * ลดลำดับ Stage ที่อยู่ถัดไปลง 1
         */
        await transaction.pipeline_stages.updateMany({
          where: {
            job_id: stage.job_id,
            stage_order: {
              gt: stage.stage_order,
            },
          },
          data: {
            stage_order: {
              decrement: 1,
            },
          },
        });
      },
      {
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  }

  private parseId(value: string, entity: string): bigint {
    if (!value || !/^\d+$/.test(value)) {
      throw new AppError(`รหัส${entity}ไม่ถูกต้อง`, 400);
    }

    const id = BigInt(value);

    if (id <= 0n) {
      throw new AppError(`รหัส${entity}ไม่ถูกต้อง`, 400);
    }

    return id;
  }
}
