import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  fetchSession,
  login,
  logout,
  type LoginRequest
} from "@/features/auth/services/authService";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { clearAuthSession, saveAuthSession } from "@/features/auth/utils/authStorage";

interface LoginUserPayload extends LoginRequest {
  expectedRole?: Exclude<UserRole, null>;
}

const getErrorStatus = (error: unknown): number | null => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    return error.response.status;
  }

  return null;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "detail" in error.response.data &&
    typeof error.response.data.detail === "string"
  ) {
    return error.response.data.detail;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const hydrateSession = createAsyncThunk<AuthUser, void, { rejectValue: string }>(
  "auth/hydrateSession",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchSession();
      return response.user;
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 401 || status === 403) {
        clearAuthSession();
      }
      return rejectWithValue(getErrorMessage(error, "No active session found."));
    }
  }
);

export const loginUser = createAsyncThunk<AuthUser, LoginUserPayload, { rejectValue: string }>(
  "auth/loginUser",
  async (payload, { rejectWithValue }) => {
    try {
      const { expectedRole, ...credentials } = payload;
      const response = await login(credentials);
      if (expectedRole && response.user.role !== expectedRole) {
        clearAuthSession();
        try {
          await logout();
        } catch {
          // Ignore cleanup failures and surface the role mismatch instead.
        }
        return rejectWithValue(`Please sign in using your ${expectedRole} account.`);
      }
      saveAuthSession(response);
      return response.user;
    } catch (error) {
      clearAuthSession();
      return rejectWithValue(getErrorMessage(error, "Invalid credentials."));
    }
  }
);

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  try {
    await logout();
  } catch {
    // Clear client state even if the server session has already expired.
  }
  clearAuthSession();
});
