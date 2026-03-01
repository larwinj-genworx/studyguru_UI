import { api } from "@/lib/axios";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest extends LoginRequest {
  role: "admin" | "student";
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: {
    user_id: string;
    email: string;
    role: "admin" | "student";
  };
}

export const login = async (payload: LoginRequest): Promise<AuthResponse> => {
  const response = await api.post("/auth/login", payload);
  return response.data as AuthResponse;
};

export const signup = async (payload: SignupRequest): Promise<AuthResponse> => {
  const response = await api.post("/auth/signup", payload);
  return response.data as AuthResponse;
};
