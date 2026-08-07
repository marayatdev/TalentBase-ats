import { api } from "./axios";
import type { ApiSuccess } from "@/types/api";
import type { PipelineStage, StageType } from "@/types/domain";
import { withMockFallback } from "./fallback";
import { mockApi } from "@/mocks/mockApi";

export interface StagePayload {
  job_id: string;
  name: string;
  stage_order: number;
  stage_type: PipelineStage["stage_type"];
}

interface BackendPipelineStage {
  id: string;
  job_id: string;
  name: string;
  stage_order: number;
  stage_type: StageType;
  created_at?: string;

  _count?: {
    applications?: number;
  };
}

interface PipelineStagesResponse {
  stages?: BackendPipelineStage[];
  pipeline_stages?: BackendPipelineStage[];
}

export interface ReorderPipelinePayload {
  stages: Array<{
    id: string;
    stage_order: number;
  }>;
}

function mapPipelineStage(stage: BackendPipelineStage): PipelineStage {
  return {
    id: stage.id,
    job_id: stage.job_id,
    name: stage.name,
    stage_order: stage.stage_order,
    stage_type: stage.stage_type,
    created_at: stage.created_at,

    application_count: stage._count?.applications ?? 0,

    candidate_count: stage._count?.applications ?? 0,
  };
}

function normalizeStagesResponse(
  value: BackendPipelineStage[] | PipelineStagesResponse,
): PipelineStage[] {
  if (Array.isArray(value)) {
    return value
      .map(mapPipelineStage)
      .sort((a, b) => a.stage_order - b.stage_order);
  }

  const stages = value.stages ?? value.pipeline_stages ?? [];

  return stages
    .map(mapPipelineStage)
    .sort((a, b) => a.stage_order - b.stage_order);
}

export const pipelineApi = {
  listForJob: (jobId: string): Promise<PipelineStage[]> =>
    withMockFallback(
      async () => {
        const { data } = await api.get<
          ApiSuccess<BackendPipelineStage[] | PipelineStagesResponse>
        >(`/pipeline-stages/job/${jobId}`);

        return normalizeStagesResponse(data.data);
      },

      async () => {
        const result = await mockApi.pipelineStages.forJob(jobId);

        return Array.isArray(result)
          ? (result as PipelineStage[])
          : normalizeStagesResponse(result as PipelineStagesResponse);
      },
    ),

  get: async (id: string): Promise<PipelineStage> => {
    const { data } = await api.get<ApiSuccess<BackendPipelineStage>>(
      `/pipeline-stages/${id}`,
    );

    return mapPipelineStage(data.data);
  },

  create: async (payload: StagePayload): Promise<PipelineStage> => {
    const { data } = await api.post<ApiSuccess<BackendPipelineStage>>(
      "/pipeline-stages",
      payload,
    );

    return mapPipelineStage(data.data);
  },

  generateDefault: async (jobId: string): Promise<PipelineStage[]> => {
    const { data } = await api.post<
      ApiSuccess<BackendPipelineStage[] | PipelineStagesResponse>
    >(`/pipeline-stages/default/${jobId}`);

    return normalizeStagesResponse(data.data);
  },

  update: async (
    id: string,
    payload: Partial<StagePayload>,
  ): Promise<PipelineStage> => {
    const { data } = await api.patch<ApiSuccess<BackendPipelineStage>>(
      `/pipeline-stages/${id}`,
      payload,
    );

    return mapPipelineStage(data.data);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/pipeline-stages/${id}`);
  },

  reorder: async (
    jobId: string,
    payload: ReorderPipelinePayload,
  ): Promise<PipelineStage[]> => {
    const { data } = await api.patch<
      ApiSuccess<BackendPipelineStage[] | PipelineStagesResponse>
    >(`/pipeline-stages/job/${jobId}/reorder`, payload);

    return normalizeStagesResponse(data.data);
  },
};
