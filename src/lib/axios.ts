import axios from "axios";

import { env } from "@/config/env";
import { loadStoredAccessToken } from "@/features/auth/utils/authStorage";

export const api = axios.create({
  baseURL: env.apiBase,
  timeout: 20000,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = loadStoredAccessToken();
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
