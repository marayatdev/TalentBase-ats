import { pipeline_stages_stage_type } from "@/generated/prisma/client";

export interface CreatePipelineStageDto {
  job_id: bigint;
  name: string;
  stage_order: number;
  stage_type?: pipeline_stages_stage_type;
}

export interface UpdatePipelineStageDto {
  name?: string;
  stage_order?: number;
  stage_type?: pipeline_stages_stage_type;
}
export interface ReorderPipelineStageItemDto {
  id: bigint;
  stage_order: number;
}

export interface ReorderPipelineStagesDto {
  stages: ReorderPipelineStageItemDto[];
}
