import type { AuthResponse } from "@/features/auth/types";

const AUTH_STORAGE_KEY = "studyguru.auth";

interface StoredAuthSession {
  access_token: string;
  token_type: string;
}

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const loadStoredAuthSession = (): StoredAuthSession | null => {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    if (!parsed.access_token || typeof parsed.access_token !== "string") {
      return null;
    }
    return {
      access_token: parsed.access_token,
      token_type: typeof parsed.token_type === "string" ? parsed.token_type : "bearer"
    };
  } catch {
    return null;
  }
};

export const loadStoredAccessToken = (): string | null => {
  return loadStoredAuthSession()?.access_token ?? null;
};

export const saveAuthSession = (response: AuthResponse): void => {
  if (!canUseStorage()) {
    return;
  }

  const payload: StoredAuthSession = {
    access_token: response.access_token,
    token_type: response.token_type
  };
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
};

export const clearAuthSession = (): void => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};
