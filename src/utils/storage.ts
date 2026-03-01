import type { AuthState } from "@/types";

const AUTH_KEY = "sg_auth";

export const loadAuthState = (): AuthState => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) {
      return { isAuthenticated: false, role: null, email: null, userId: null, accessToken: null };
    }
    const parsed = JSON.parse(raw) as AuthState;
    const accessToken = parsed.accessToken ?? null;
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated) && Boolean(accessToken),
      role: parsed.role ?? null,
      email: parsed.email ?? null,
      userId: parsed.userId ?? null,
      accessToken
    };
  } catch {
    return { isAuthenticated: false, role: null, email: null, userId: null, accessToken: null };
  }
};

export const saveAuthState = (state: AuthState): void => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
};

export const clearAuthState = (): void => {
  localStorage.removeItem(AUTH_KEY);
};
