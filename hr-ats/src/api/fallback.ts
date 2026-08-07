import type { AxiosError } from "axios";

/**
 * Runs the real API call. If it fails because the backend is unreachable
 * (no response at all, e.g. localhost:3000 isn't running yet) AND we're in
 * a dev build, fall back to the isolated mock service so the UI stays
 * demoable. Any real error response from the server (4xx/5xx) is rethrown
 * as-is so error states still work correctly.
 */
export async function withMockFallback<T>(real: () => Promise<T>, mock: () => Promise<T>): Promise<T> {
  try {
    return await real();
  } catch (error) {
    const err = error as AxiosError;
    const isNetworkError = !err?.response;
    if (import.meta.env.DEV && isNetworkError) {
      return mock();
    }
    throw error;
  }
}
