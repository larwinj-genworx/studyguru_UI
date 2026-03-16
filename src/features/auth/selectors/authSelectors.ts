import type { RootState } from "@/app/rootReducer";

export const selectAuthState = (state: RootState) => state.auth;

export const selectAuthStatus = (state: RootState) => state.auth.status;

export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

export const selectCurrentUserRole = (state: RootState) => state.auth.role;
