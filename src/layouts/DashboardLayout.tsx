import React from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { logout } from "@/features/auth/slices/authSlice";
import { clearAuthState } from "@/utils/storage";

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  showHeader?: boolean;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  showHeader = true,
  children
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { role, email } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    clearAuthState();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark">SG</div>
            <div>
              <p className="brand-name">StudyGuru</p>
              <span className="brand-role">{role === "admin" ? "Administrator" : "Student"}</span>
            </div>
          </div>
          <div className="sidebar-card">
            <p className="sidebar-label">Signed in as</p>
            <p className="sidebar-value">{email}</p>
          </div>
        </div>
        <button className="button ghost" onClick={handleLogout}>
          Log out
        </button>
      </aside>
      <main className="content">
        {showHeader ? (
          <header className="content-header">
            <div>
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </header>
        ) : null}
        <section className="content-body">{children}</section>
      </main>
    </div>
  );
};
