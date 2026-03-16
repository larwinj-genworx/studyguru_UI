import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { NotFound } from "@/components/common/NotFound";
import {
  selectAuthState,
  selectAuthStatus
} from "@/features/auth/selectors/authSelectors";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { SignupPage } from "@/features/auth/components/SignupPage";
import { StudentQuizPage } from "@/features/quiz/components/StudentQuizPage";
import { AdminDashboard } from "@/features/study_material/components/AdminDashboard";
import { AdminStudentActivityPage } from "@/features/study_material/components/AdminStudentActivityPage";
import { ConceptLearningPage } from "@/features/study_material/components/ConceptLearningPage";
import { StudentDashboard } from "@/features/study_material/components/StudentDashboard";
import { useAppSelector } from "@/hooks/useAppSelector";

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, role } = useAppSelector(selectAuthState);
  const authStatus = useAppSelector(selectAuthStatus);

  if (authStatus === "idle" || authStatus === "loading") {
    return (
      <div className="loading-overlay">
        <LoadingSpinner />
      </div>
    );
  }

  const defaultPath = isAuthenticated ? (role === "admin" ? "/admin" : "/student") : "/login";

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultPath} replace />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={defaultPath} replace /> : <LoginPage />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to={defaultPath} replace /> : <SignupPage />}
      />
      <Route
        path="/admin"
        element={
          <RequireAuth role="admin">
            <AdminDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/subjects/:subjectId/students/:studentId"
        element={
          <RequireAuth role="admin">
            <AdminStudentActivityPage />
          </RequireAuth>
        }
      />
      <Route
        path="/student"
        element={
          <RequireAuth role="student">
            <StudentDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/student/quiz/:sessionId"
        element={
          <RequireAuth role="student">
            <StudentQuizPage />
          </RequireAuth>
        }
      />
      <Route
        path="/learn/:subjectId/:conceptId"
        element={
          <RequireAuth>
            <ConceptLearningPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
