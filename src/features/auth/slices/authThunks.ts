import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  fetchSession,
  login,
  logout,
  signup,
  type LoginRequest,
  type SignupRequest
} from "@/features/auth/services/authService";
import type { AuthUser, UserRole } from "@/features/auth/types";

interface LoginUserPayload extends LoginRequest {
  expectedRole?: Exclude<UserRole, null>;
}

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
        try {
          await logout();
        } catch {
          // Ignore cleanup failures and surface the role mismatch instead.
        }
        return rejectWithValue(`Please sign in using your ${expectedRole} account.`);
      }
      return response.user;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Invalid credentials."));
    }
  }
);

export const signupUser = createAsyncThunk<AuthUser, SignupRequest, { rejectValue: string }>(
  "auth/signupUser",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await signup(payload);
      return response.user;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Signup failed."));
    }
  }
);

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  try {
    await logout();
  } catch {
    // Clear client state even if the server session has already expired.
  }
});
