export type UserRole = "admin" | "student" | null;

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthUser {
  user_id: string;
  email: string;
  role: Exclude<UserRole, null>;
  organization_id: string;
}

export interface AuthState {
  status: AuthStatus;
  isAuthenticated: boolean;
  role: UserRole;
  email: string | null;
  userId: string | null;
  organizationId: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
}

export interface SessionResponse {
  user: AuthUser;
}
