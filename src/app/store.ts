import { configureStore } from "@reduxjs/toolkit";

import { rootReducer } from "@/app/rootReducer";
import { middleware } from "@/app/middleware";

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    }).concat(middleware)
});

export type AppDispatch = typeof store.dispatch;
