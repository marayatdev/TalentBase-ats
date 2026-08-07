import { useMutation } from "@tanstack/react-query";
import { authApi, type LoginPayload, type RegisterPayload } from "@/api/auth.api";
import { useAuthStore } from "@/store/auth.store";

export function useAuth() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  return { user, isAuthenticated, isLoading };
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (user) => setUser(user),
  });
}

export function useRegister() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (user) => setUser(user),
  });
}

export function useLogout() {
  const logoutStore = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        // Ignore network errors on logout — clear local session regardless.
      }
    },
    onSuccess: () => logoutStore(),
    onSettled: () => logoutStore(),
  });
}
