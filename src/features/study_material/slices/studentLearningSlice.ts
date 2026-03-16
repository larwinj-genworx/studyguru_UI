import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { logoutUser } from "@/features/auth/slices/authThunks";
import {
  addStudentBookmark,
  getStudentSubjectProgression,
  listStudentBookmarks,
  markStudentTopicComplete,
  removeStudentBookmark
} from "@/features/study_material/services/studyMaterialService";
import type {
  ConceptBookmarkResponse,
  StudentSubjectProgressResponse
} from "@/features/study_material/types";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

interface StudentLearningState {
  bookmarksBySubject: Record<string, ConceptBookmarkResponse[]>;
  bookmarksStatusBySubject: Record<string, AsyncStatus>;
  progressionBySubject: Record<string, StudentSubjectProgressResponse>;
  progressionStatusBySubject: Record<string, AsyncStatus>;
}

interface ToggleBookmarkPayload {
  subjectId: string;
  conceptId: string;
  currentlyBookmarked: boolean;
}

const initialState: StudentLearningState = {
  bookmarksBySubject: {},
  bookmarksStatusBySubject: {},
  progressionBySubject: {},
  progressionStatusBySubject: {}
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "detail" in error.response.data &&
    typeof error.response.data.detail === "string"
  ) {
    return error.response.data.detail;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const fetchStudentBookmarks = createAsyncThunk<
  { subjectId: string; bookmarks: ConceptBookmarkResponse[] },
  string,
  { rejectValue: string }
>("studentLearning/fetchBookmarks", async (subjectId, { rejectWithValue }) => {
  try {
    const bookmarks = await listStudentBookmarks(subjectId);
    return { subjectId, bookmarks };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to load bookmarks."));
  }
});

export const toggleStudentBookmark = createAsyncThunk<
  { subjectId: string; bookmarks: ConceptBookmarkResponse[] },
  ToggleBookmarkPayload,
  { rejectValue: string }
>("studentLearning/toggleBookmark", async (payload, { rejectWithValue }) => {
  try {
    if (payload.currentlyBookmarked) {
      await removeStudentBookmark(payload.subjectId, payload.conceptId);
    } else {
      await addStudentBookmark(payload.subjectId, payload.conceptId);
    }

    const bookmarks = await listStudentBookmarks(payload.subjectId);
    return { subjectId: payload.subjectId, bookmarks };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to update bookmark."));
  }
});

export const fetchStudentProgression = createAsyncThunk<
  { subjectId: string; progression: StudentSubjectProgressResponse },
  string,
  { rejectValue: string }
>("studentLearning/fetchProgression", async (subjectId, { rejectWithValue }) => {
  try {
    const progression = await getStudentSubjectProgression(subjectId);
    return { subjectId, progression };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to load progression."));
  }
});

export const completeStudentTopic = createAsyncThunk<
  { subjectId: string; progression: StudentSubjectProgressResponse },
  { subjectId: string; conceptId: string },
  { rejectValue: string }
>("studentLearning/completeTopic", async ({ subjectId, conceptId }, { rejectWithValue }) => {
  try {
    await markStudentTopicComplete(subjectId, conceptId);
    const progression = await getStudentSubjectProgression(subjectId);
    return { subjectId, progression };
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to update the topic progression.")
    );
  }
});

const studentLearningSlice = createSlice({
  name: "studentLearning",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentBookmarks.pending, (state, action) => {
        state.bookmarksStatusBySubject[action.meta.arg] = "loading";
      })
      .addCase(fetchStudentBookmarks.fulfilled, (state, action) => {
        state.bookmarksBySubject[action.payload.subjectId] = action.payload.bookmarks;
        state.bookmarksStatusBySubject[action.payload.subjectId] = "succeeded";
      })
      .addCase(fetchStudentBookmarks.rejected, (state, action) => {
        state.bookmarksStatusBySubject[action.meta.arg] = "failed";
      })
      .addCase(toggleStudentBookmark.pending, (state, action) => {
        state.bookmarksStatusBySubject[action.meta.arg.subjectId] = "loading";
      })
      .addCase(toggleStudentBookmark.fulfilled, (state, action) => {
        state.bookmarksBySubject[action.payload.subjectId] = action.payload.bookmarks;
        state.bookmarksStatusBySubject[action.payload.subjectId] = "succeeded";
      })
      .addCase(toggleStudentBookmark.rejected, (state, action) => {
        state.bookmarksStatusBySubject[action.meta.arg.subjectId] = "failed";
      })
      .addCase(fetchStudentProgression.pending, (state, action) => {
        state.progressionStatusBySubject[action.meta.arg] = "loading";
      })
      .addCase(fetchStudentProgression.fulfilled, (state, action) => {
        state.progressionBySubject[action.payload.subjectId] = action.payload.progression;
        state.progressionStatusBySubject[action.payload.subjectId] = "succeeded";
      })
      .addCase(fetchStudentProgression.rejected, (state, action) => {
        state.progressionStatusBySubject[action.meta.arg] = "failed";
      })
      .addCase(completeStudentTopic.pending, (state, action) => {
        state.progressionStatusBySubject[action.meta.arg.subjectId] = "loading";
      })
      .addCase(completeStudentTopic.fulfilled, (state, action) => {
        state.progressionBySubject[action.payload.subjectId] = action.payload.progression;
        state.progressionStatusBySubject[action.payload.subjectId] = "succeeded";
      })
      .addCase(completeStudentTopic.rejected, (state, action) => {
        state.progressionStatusBySubject[action.meta.arg.subjectId] = "failed";
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  }
});

export default studentLearningSlice.reducer;
