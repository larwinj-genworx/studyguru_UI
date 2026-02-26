import axios from "axios";

import { env } from "@/config/env";
import { loadAuthState } from "@/utils/storage";

export const api = axios.create({
  baseURL: env.apiBase,
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const auth = loadAuthState();
  if (auth.role) {
    config.headers = config.headers || {};
    config.headers["X-Role"] = auth.role;
  }
  return config;
});
