import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "@/app/routes";
import { store } from "@/app/store";
import { hydrateSession } from "@/features/auth/slices/authThunks";
import "@/styles/globals.css";

void store.dispatch(hydrateSession());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
