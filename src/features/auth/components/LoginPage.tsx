import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { loginSuccess } from "@/features/auth/slices/authSlice";

const ADMIN_CREDENTIALS = {
  email: "admin@gmail.com",
  password: "Test@123"
};

const STUDENT_CREDENTIALS = {
  email: "student@gmail.com",
  password: "Test@123"
};

interface LoginFormState {
  email: string;
  password: string;
  error?: string;
}

export const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [adminForm, setAdminForm] = useState<LoginFormState>({
    email: ADMIN_CREDENTIALS.email,
    password: ""
  });
  const [studentForm, setStudentForm] = useState<LoginFormState>({
    email: STUDENT_CREDENTIALS.email,
    password: ""
  });
  const [activeRole, setActiveRole] = useState<"admin" | "student">("admin");

  const handleAdminSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      adminForm.email.trim() === ADMIN_CREDENTIALS.email &&
      adminForm.password === ADMIN_CREDENTIALS.password
    ) {
      dispatch(loginSuccess({ role: "admin", email: adminForm.email }));
      navigate("/admin");
    } else {
      setAdminForm((prev) => ({ ...prev, error: "Invalid admin credentials." }));
    }
  };

  const handleStudentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      studentForm.email.trim() === STUDENT_CREDENTIALS.email &&
      studentForm.password === STUDENT_CREDENTIALS.password
    ) {
      dispatch(loginSuccess({ role: "student", email: studentForm.email }));
      navigate("/student");
    } else {
      setStudentForm((prev) => ({ ...prev, error: "Invalid student credentials." }));
    }
  };

  const isAdmin = activeRole === "admin";
  const activeForm = isAdmin ? adminForm : studentForm;
  const setActiveForm = isAdmin ? setAdminForm : setStudentForm;
  const roleTitle = isAdmin ? "Admin Login" : "Student Login";
  const roleDescription = isAdmin
    ? "Manage syllabi, generate materials, and publish."
    : "Explore published study materials and downloads.";
  const roleCta = isAdmin ? "Sign in as Admin" : "Sign in as Student";

  return (
    <AuthLayout>
      <div className="login-stack">
        <div>
          <p className="eyebrow">Welcome</p>
          <h2>Sign in to continue</h2>
          <p className="muted">Choose the role that matches your workspace.</p>
        </div>
        <Card className="login-card">
          <div className="login-switch" role="tablist" aria-label="Select login role">
            <button
              type="button"
              className={isAdmin ? "active" : ""}
              onClick={() => setActiveRole("admin")}
              aria-pressed={isAdmin}
            >
              Admin
            </button>
            <button
              type="button"
              className={!isAdmin ? "active" : ""}
              onClick={() => setActiveRole("student")}
              aria-pressed={!isAdmin}
            >
              Student
            </button>
          </div>
          <div className="login-card-header">
            <h3>{roleTitle}</h3>
            <p className="muted">{roleDescription}</p>
          </div>
          <form onSubmit={isAdmin ? handleAdminSubmit : handleStudentSubmit} className="form-stack">
            <Input
              label={isAdmin ? "Admin Email" : "Student Email"}
              type="email"
              value={activeForm.email}
              onChange={(event) =>
                setActiveForm((prev) => ({ ...prev, email: event.target.value, error: undefined }))
              }
              required
            />
            <Input
              label="Password"
              type="password"
              value={activeForm.password}
              onChange={(event) =>
                setActiveForm((prev) => ({ ...prev, password: event.target.value, error: undefined }))
              }
              required
            />
            {activeForm.error ? <p className="form-error">{activeForm.error}</p> : null}
            <Button type="submit" variant={isAdmin ? "primary" : "secondary"}>
              {roleCta}
            </Button>
          </form>
        </Card>
      </div>
    </AuthLayout>
  );
};
