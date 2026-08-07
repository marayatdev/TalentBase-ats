import { api } from "./axios";
import type { ApiSuccess } from "@/types/api";
import type { Interview } from "@/types/domain";

export interface CreateInterviewPayload {
  application_id: string;
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  interviewer_emails: string[];
}

export interface UpdateInterviewPayload {
  title?: string;
  description?: string | null;

  start_at: string;
  end_at: string;
  timezone: string;

  interviewer_emails: string[];
}

interface ApplicationInterviewsResponse {
  interviews: Interview[];
}

export const interviewsApi = {
  listByApplication: async (applicationId: string): Promise<Interview[]> => {
    const { data } = await api.get<ApiSuccess<ApplicationInterviewsResponse>>(
      `/interviews/application/${applicationId}`,
    );

    return data.data.interviews;
  },

  get: async (id: string): Promise<Interview> => {
    const { data } = await api.get<ApiSuccess<Interview>>(`/interviews/${id}`);

    return data.data;
  },

  create: async (payload: CreateInterviewPayload): Promise<Interview> => {
    const { data } = await api.post<ApiSuccess<Interview>>(
      "/interviews",
      payload,
    );

    return data.data;
  },

  update: async (
  id: string,
  payload: UpdateInterviewPayload,
): Promise<Interview> => {
  const { data } = await api.patch<ApiSuccess<Interview>>(
    `/interviews/${id}`,
    payload,
  );

  return data.data;
},

  cancel: async (id: string): Promise<Interview> => {
    const { data } = await api.post<ApiSuccess<Interview>>(
      `/interviews/${id}/cancel`,
    );

    return data.data;
  },
};
