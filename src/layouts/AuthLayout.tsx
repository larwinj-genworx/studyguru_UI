import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-layout">
      <div className="auth-hero">
        <div className="hero-content">
          <p className="eyebrow brand-eyebrow">StudyGuru</p>
          <h1>Design study materials that feel personal.</h1>
          <p>
            Create syllabi, generate rich explanations, and publish to students with a
            workflow built for clarity.
          </p>
          <div className="hero-highlight">
            <span>Admin & Student access</span>
            <span>Structured AI workflow</span>
            <span>Publish-ready artifacts</span>
          </div>
        </div>
      </div>
      <div className="auth-panel">{children}</div>
    </div>
  );
};
