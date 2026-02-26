import { configureStore } from "@reduxjs/toolkit";

import { rootReducer } from "@/app/rootReducer";
import { middleware } from "@/app/middleware";
import { loadAuthState } from "@/utils/storage";

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    auth: loadAuthState()
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    }).concat(middleware)
});

export type AppDispatch = typeof store.dispatch;
