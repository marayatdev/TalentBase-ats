import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  googleAuthApi,
  type GoogleConnection,
} from "@/api/google-auth.api";

const GOOGLE_CONNECTION_QUERY_KEY = [
  "google-auth",
  "connection",
] as const;

export function useGoogleConnection() {
  return useQuery<GoogleConnection>({
    queryKey: GOOGLE_CONNECTION_QUERY_KEY,

    queryFn: () =>
      googleAuthApi.getConnection(),

    retry: false,

    staleTime: 30_000,
  });
}

export function useGoogleAuthUrl() {
  return useMutation({
    mutationFn: () =>
      googleAuthApi.getAuthUrl(),
  });
}

export function useConnectGoogle() {
  const getAuthUrl =
    useGoogleAuthUrl();

  function connect(): void {
    getAuthUrl.mutate(undefined, {
      onSuccess: (authUrl) => {
        window.location.assign(authUrl);
      },
    });
  }

  return {
    connect,

    isPending:
      getAuthUrl.isPending,

    isError:
      getAuthUrl.isError,

    error:
      getAuthUrl.error,

    reset:
      getAuthUrl.reset,
  };
}

export function useDisconnectGoogle() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: () =>
      googleAuthApi.disconnect(),

    onSuccess: () => {
      queryClient.setQueryData<GoogleConnection>(
        GOOGLE_CONNECTION_QUERY_KEY,
        {
          connected: false,
          google_email: null,
          connected_at: null,
          updated_at: null,
        },
      );

      void queryClient.invalidateQueries({
        queryKey:
          GOOGLE_CONNECTION_QUERY_KEY,
      });
    },
  });
}

export function useRefreshGoogleConnection() {
  const queryClient =
    useQueryClient();

  return async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey:
        GOOGLE_CONNECTION_QUERY_KEY,
    });
  };
}