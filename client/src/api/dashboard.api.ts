import { api } from "./axios";
import type { ApiSuccess } from "@/types/api";
import { withMockFallback } from "./fallback";
import { mockApi } from "@/mocks/mockApi";
import type { mockDashboard } from "@/mocks/data";

export type DashboardData = typeof mockDashboard;

export const dashboardApi = {
  summary: () =>
    withMockFallback(
      async () => {
        const { data } = await api.get<ApiSuccess<DashboardData>>("/dashboard/summary");
        return data.data;
      },
      () => mockApi.dashboard()
    ),
};
