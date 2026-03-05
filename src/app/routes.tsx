import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { SignupPage } from "@/features/auth/components/SignupPage";
import { AdminDashboard } from "@/features/study_material/components/AdminDashboard";
import { StudentDashboard } from "@/features/study_material/components/StudentDashboard";
import { ConceptLearningPage } from "@/features/study_material/components/ConceptLearningPage";
import { StudentQuizPage } from "@/features/quiz/components/StudentQuizPage";
import { NotFound } from "@/components/common/NotFound";
import { useAppSelector } from "@/hooks/useAppSelector";

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, role } = useAppSelector((state) => state.auth);

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
