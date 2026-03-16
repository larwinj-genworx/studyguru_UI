import { combineReducers } from "@reduxjs/toolkit";

import authReducer from "@/features/auth/slices/authSlice";
import studentLearningReducer from "@/features/study_material/slices/studentLearningSlice";

export const rootReducer = combineReducers({
  auth: authReducer,
  studentLearning: studentLearningReducer
});

export type RootState = ReturnType<typeof rootReducer>;
