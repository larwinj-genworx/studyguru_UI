import type { Middleware } from "@reduxjs/toolkit";

import { saveAuthState } from "@/utils/storage";

export const loggerMiddleware: Middleware = (storeApi) => (next) => (action) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[Action]", action);
  }
  const result = next(action);
  const state = storeApi.getState();
  saveAuthState(state.auth);
  return result;
};

export const middleware = [loggerMiddleware];
