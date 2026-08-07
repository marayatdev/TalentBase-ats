import { api, normalizeError } from "./axios";
import type { ApiSuccess } from "@/types/api";
import type { User } from "@/types/domain";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: string;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<User> => {
    try {
      const { data } = await api.post<ApiSuccess<User>>("/auth/login", payload);
      return data.data;
    } catch (error) {
      // Demo fallback: without a live backend at localhost:3000, allow sign-in
      // with any credentials so the rest of the app can be reviewed.
      const normalized = normalizeError(error);
      if (import.meta.env.DEV && normalized.status === 0) {
        return { id: "1", name: payload.email.split("@")[0] || "HR Admin", email: payload.email, role: "hr" };
      }
      throw error;
    }
  },
  register: async (payload: RegisterPayload): Promise<User> => {
    try {
      const { data } = await api.post<ApiSuccess<User>>("/auth/register", payload);
      return data.data;
    } catch (error) {
      const normalized = normalizeError(error);
      if (import.meta.env.DEV && normalized.status === 0) {
        return { id: "1", name: payload.name, email: payload.email, role: (payload.role as User["role"]) || "hr" };
      }
      throw error;
    }
  },
  me: async (): Promise<User> => {
    const { data } = await api.get<ApiSuccess<User>>("/auth/me");
    return data.data;
  },
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },
};
