import type { Middleware } from "@reduxjs/toolkit";

export const loggerMiddleware: Middleware = () => (next) => (action) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[Action]", action);
  }

  return next(action);
};

export const middleware = [loggerMiddleware];
