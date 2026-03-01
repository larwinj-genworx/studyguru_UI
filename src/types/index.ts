export type UserRole = "admin" | "student" | null;

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole;
  email: string | null;
  userId: string | null;
  accessToken: string | null;
}
