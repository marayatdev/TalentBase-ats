import { api } from "./axios";

import type { ApiSuccess } from "@/types/api";

export interface GoogleConnection {
  connected: boolean;
  google_email: string | null;
  connected_at: string | null;
  updated_at: string | null;
}

interface GoogleAuthUrlResponse {
  auth_url?: string;
  authUrl?: string;
  url?: string;
}

export const googleAuthApi = {
  getConnection: async (): Promise<GoogleConnection> => {
    const { data } = await api.get<
      ApiSuccess<GoogleConnection>
    >("/google-auth/connection");

    return data.data;
  },

  getAuthUrl: async (): Promise<string> => {
    const { data } = await api.get<
      ApiSuccess<GoogleAuthUrlResponse | string>
    >("/google-auth/auth-url");

    if (typeof data.data === "string") {
      return data.data;
    }

    const authUrl =
      data.data.auth_url ??
      data.data.authUrl ??
      data.data.url;

    if (!authUrl) {
      throw new Error(
        "Google authorization URL was not returned",
      );
    }

    return authUrl;
  },

  disconnect: async (): Promise<void> => {
    await api.delete(
      "/google-auth/connection",
    );
  },
};