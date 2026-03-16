import { api } from "@/lib/axios";
import type { AuthResponse, SessionResponse } from "@/features/auth/types";

export interface LoginRequest {
  email: string;
  password: string;
}

export const login = async (payload: LoginRequest): Promise<AuthResponse> => {
  const response = await api.post("/auth/login", payload);
  return response.data as AuthResponse;
};

export const fetchSession = async (): Promise<SessionResponse> => {
  const response = await api.get("/auth/session");
  return response.data as SessionResponse;
};

export const logout = async (): Promise<void> => {
  await api.post("/auth/logout");
};
