import React, { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { logoutUser } from "@/features/auth/slices/authThunks";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";

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

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  useEffect(() => {
    document.body.classList.add("dashboard-body");
    return () => {
      document.body.classList.remove("dashboard-body");
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">SG</div>
            <div>
              <p className="brand-name">StudyGuru</p>
              <span className="brand-role">{role === "admin" ? "Administrator" : "Student"}</span>
            </div>
          </div>
          {role === "admin" ? (
            <nav className="sidebar-nav" aria-label="Admin navigation">
              <NavLink to="/admin" end className={({ isActive }) => `sidebar-nav-link ${isActive ? "active" : ""}`.trim()}>
                <span>Syllabus Workspace</span>
                <small>Course setup and publishing</small>
              </NavLink>
              <NavLink
                to="/admin/students"
                className={({ isActive }) => `sidebar-nav-link ${isActive ? "active" : ""}`.trim()}
              >
                <span>Student Hub</span>
                <small>Student search and tracking</small>
              </NavLink>
            </nav>
          ) : null}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-card sidebar-account-card">
            <p className="sidebar-label">Signed in as</p>
            <p className="sidebar-value">{email}</p>
          </div>
          <button className="button ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
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
