import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { selectAuthState, selectAuthStatus } from "@/features/auth/selectors/authSelectors";
import { useAppSelector } from "@/hooks/useAppSelector";

interface RequireAuthProps {
  children: React.ReactElement;
  role?: "admin" | "student";
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children, role }) => {
  const location = useLocation();
  const { isAuthenticated, role: currentRole } = useAppSelector(selectAuthState);
  const authStatus = useAppSelector(selectAuthStatus);

  if (authStatus === "idle" || authStatus === "loading") {
    return (
      <div className="loading-overlay">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && currentRole !== role) {
    return <Navigate to={currentRole === "admin" ? "/admin" : "/student"} replace />;
  }

  return children;
};
