import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { AuthState, UserRole } from "@/types";

const initialState: AuthState = {
  isAuthenticated: false,
  role: null,
  email: null
};

interface LoginPayload {
  role: Exclude<UserRole, null>;
  email: string;
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<LoginPayload>) => {
      state.isAuthenticated = true;
      state.role = action.payload.role;
      state.email = action.payload.email;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.role = null;
      state.email = null;
    }
  }
});

export const { loginSuccess, logout } = authSlice.actions;

export default authSlice.reducer;
