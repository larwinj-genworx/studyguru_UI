import type { RootState } from "@/app/rootReducer";

export const selectStudentBookmarks = (state: RootState, subjectId: string | null | undefined) => {
  if (!subjectId) {
    return [];
  }

  return state.studentLearning.bookmarksBySubject[subjectId] ?? [];
};

export const selectStudentBookmarksStatus = (
  state: RootState,
  subjectId: string | null | undefined
) => {
  if (!subjectId) {
    return "idle" as const;
  }

  return state.studentLearning.bookmarksStatusBySubject[subjectId] ?? "idle";
};

export const selectStudentProgression = (
  state: RootState,
  subjectId: string | null | undefined
) => {
  if (!subjectId) {
    return null;
  }

  return state.studentLearning.progressionBySubject[subjectId] ?? null;
};

export const selectStudentProgressionStatus = (
  state: RootState,
  subjectId: string | null | undefined
) => {
  if (!subjectId) {
    return "idle" as const;
  }

  return state.studentLearning.progressionStatusBySubject[subjectId] ?? "idle";
};
