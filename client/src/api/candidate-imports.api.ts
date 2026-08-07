import { api } from "./axios";
import type { ApiSuccess } from "@/types/api";
import type {
  CandidateImport,
  ImportSource,
  ImportStatus,
  ParsedCandidateText,
} from "@/types/domain";

export interface ParseCandidateTextPayload {
  raw_text: string;
  source: ImportSource;
  source_url?: string;
}

export interface ManualCandidateImportPayload {
  full_name: string;
  email?: string;
  phone?: string;
  current_position?: string;
  source: ImportSource;
  source_url?: string;
  raw_text?: string;
  job_id: string;
}

export interface ManualCandidateImportResult {
  candidate_id: string;
  application_id: string;
  import_id: string;
  is_duplicate: boolean;
}

export interface ImportHistoryParams {
  page?: number;
  limit?: number;
  source?: ImportSource;
  import_status?: ImportStatus;
}

export interface ImportHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ImportHistoryResult {
  imports: CandidateImport[];
  pagination: ImportHistoryPagination;
}

interface BackendCandidateImport {
  id: string;
  candidate_id: string | null;
  application_id: string | null;
  job_id: string | null;

  source: ImportSource;
  source_url: string | null;
  raw_text?: string | null;

  import_status: ImportStatus;
  error_message: string | null;

  created_at: string;
  updated_at: string;

  /*
   * รองรับ relation ที่ Backend ส่งตรงจาก Prisma
   */
  candidates?: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;

  jobs?: {
    id: string;
    title: string;
  } | null;

  applications?: {
    id: string;
    status: CandidateImport["application"] extends infer T
      ? T extends { status: infer S }
        ? S
        : never
      : never;
  } | null;

  users?: {
    id: string;
    name: string;
    email: string;
  } | null;

  /*
   * รองรับกรณี Backend map relation มาแล้ว
   */
  candidate?: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;

  job?: {
    id: string;
    title: string;
  } | null;

  application?: {
    id: string;
    status: "active" | "hired" | "rejected" | "withdrawn";
  } | null;

  imported_by?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface BackendImportHistoryResponse {
  imports: BackendCandidateImport[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

function mapCandidateImport(value: BackendCandidateImport): CandidateImport {
  const candidate = value.candidates ?? value.candidate ?? null;

  const job = value.jobs ?? value.job ?? null;

  const application = value.applications ?? value.application ?? null;

  const importedBy = value.users ?? value.imported_by ?? null;

  return {
    id: value.id,

    candidate_id: value.candidate_id,

    application_id: value.application_id,

    job_id: value.job_id,

    source: value.source,

    source_url: value.source_url,

    raw_text: value.raw_text ?? null,

    import_status: value.import_status,

    error_message: value.error_message,

    candidate,
    job,
    application,

    imported_by: importedBy,

    created_at: value.created_at,

    updated_at: value.updated_at,
  };
}

export const candidateImportsApi = {
  parseText: async (
    payload: ParseCandidateTextPayload,
  ): Promise<ParsedCandidateText> => {
    const { data } = await api.post<ApiSuccess<ParsedCandidateText>>(
      "/candidate-imports/parse-text",
      payload,
    );

    return data.data;
  },

  importManual: async (
    payload: ManualCandidateImportPayload,
  ): Promise<ManualCandidateImportResult> => {
    const { data } = await api.post<ApiSuccess<ManualCandidateImportResult>>(
      "/candidate-imports/manual",
      payload,
    );

    return data.data;
  },

  getHistory: async (
    params: ImportHistoryParams = {},
  ): Promise<ImportHistoryResult> => {
    const page = Math.max(params.page ?? 1, 1);

    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);

    const { data } = await api.get<ApiSuccess<BackendImportHistoryResponse>>(
      "/candidate-imports",
      {
        params: {
          page,
          limit,
          source: params.source,

          import_status: params.import_status,
        },
      },
    );

    const pagination = data.data.pagination;

    return {
      imports: data.data.imports.map(mapCandidateImport),

      pagination: {
        page: pagination.page,

        limit: pagination.limit,

        total: pagination.total,

        totalPages: pagination.totalPages,

        hasNextPage:
          pagination.hasNextPage ?? pagination.page < pagination.totalPages,

        hasPreviousPage: pagination.hasPreviousPage ?? pagination.page > 1,
      },
    };
  },
};
