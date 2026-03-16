import { createSlice } from "@reduxjs/toolkit";

import {
  hydrateSession,
  loginUser,
  logoutUser
} from "@/features/auth/slices/authThunks";
import type { AuthState, AuthUser } from "@/features/auth/types";

const initialState: AuthState = {
  status: "idle",
  isAuthenticated: false,
  role: null,
  email: null,
  userId: null,
  organizationId: null
};

const applyAuthenticatedUser = (state: AuthState, user: AuthUser) => {
  state.status = "authenticated";
  state.isAuthenticated = true;
  state.role = user.role;
  state.email = user.email;
  state.userId = user.user_id;
  state.organizationId = user.organization_id;
};

const clearAuthenticatedUser = (state: AuthState) => {
  state.status = "unauthenticated";
  state.isAuthenticated = false;
  state.role = null;
  state.email = null;
  state.userId = null;
  state.organizationId = null;
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrateSession.pending, (state) => {
        if (state.status === "idle") {
          state.status = "loading";
        }
      })
      .addCase(hydrateSession.fulfilled, (state, action) => {
        applyAuthenticatedUser(state, action.payload);
      })
      .addCase(hydrateSession.rejected, (state) => {
        clearAuthenticatedUser(state);
      })
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        applyAuthenticatedUser(state, action.payload);
      })
      .addCase(loginUser.rejected, (state) => {
        clearAuthenticatedUser(state);
      })
      .addCase(logoutUser.fulfilled, (state) => {
        clearAuthenticatedUser(state);
      });
  }
});

export default authSlice.reducer;
