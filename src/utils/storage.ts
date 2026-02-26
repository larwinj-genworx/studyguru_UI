import type { AuthState } from "@/types";

const AUTH_KEY = "sg_auth";
const SUBJECT_KEY = "sg_admin_subjects";
const JOB_KEY = "sg_admin_jobs";

export const loadAuthState = (): AuthState => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) {
      return { isAuthenticated: false, role: null, email: null };
    }
    const parsed = JSON.parse(raw) as AuthState;
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      role: parsed.role ?? null,
      email: parsed.email ?? null
    };
  } catch {
    return { isAuthenticated: false, role: null, email: null };
  }
};

export const saveAuthState = (state: AuthState): void => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
};

export const clearAuthState = (): void => {
  localStorage.removeItem(AUTH_KEY);
};

export interface StoredSubject {
  subject_id: string;
  name: string;
  grade_level: string;
  description?: string | null;
}

export const loadStoredSubjects = (): StoredSubject[] => {
  try {
    const raw = localStorage.getItem(SUBJECT_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredSubject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveStoredSubjects = (subjects: StoredSubject[]): void => {
  localStorage.setItem(SUBJECT_KEY, JSON.stringify(subjects));
};

export const loadStoredJobs = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(JOB_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const saveStoredJobs = (jobs: Record<string, string>): void => {
  localStorage.setItem(JOB_KEY, JSON.stringify(jobs));
};
