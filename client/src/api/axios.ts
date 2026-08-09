import axios, { type AxiosError } from "axios";
import type { ApiError } from "@/types/api";


const apiOrigin =
  import.meta.env.VITE_API_BASE_URL ?? "https://talentbase-ats-production.up.railway.app/api";

export const api = axios.create({
  baseURL: `${apiOrigin}`,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// Normalized error shape the rest of the app can rely on, regardless of
// whether the backend responded with a structured envelope or the request
// never made it to the server at all.
export interface NormalizedApiError {
  message: string;
  status: number;
  errors?: Record<string, string[] | string>;
}

export function normalizeError(error: unknown): NormalizedApiError {
  const err = error as AxiosError<ApiError>;
  if (err?.response?.data) {
    const body = err.response.data;
    return {
      message: body.message || "Something went wrong. Please try again.",
      status: body.status ?? err.response.status,
      errors: body.errors,
    };
  }
  if (err?.request) {
    return {
      message:
        "Could not reach the server. Check your connection and try again.",
      status: 0,
    };
  }
  return { message: "An unexpected error occurred.", status: 500 };
}

let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);
