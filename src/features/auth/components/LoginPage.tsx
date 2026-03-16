import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthLayout } from "@/layouts/AuthLayout";
import { loginUser } from "@/features/auth/slices/authThunks";
import { useAppDispatch } from "@/hooks/useAppDispatch";

interface LoginFormState {
  email: string;
  password: string;
  error?: string;
}

export const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [adminForm, setAdminForm] = useState<LoginFormState>({
    email: "",
    password: ""
  });
  const [studentForm, setStudentForm] = useState<LoginFormState>({
    email: "",
    password: ""
  });
  const [activeRole, setActiveRole] = useState<"admin" | "student">("admin");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
    expectedRole: "admin" | "student"
  ) => {
    event.preventDefault();
    const form = expectedRole === "admin" ? adminForm : studentForm;
    const setForm = expectedRole === "admin" ? setAdminForm : setStudentForm;

    try {
      const user = await dispatch(
        loginUser({
          email: form.email.trim(),
          password: form.password,
          expectedRole
        })
      ).unwrap();

      navigate(user.role === "admin" ? "/admin" : "/student");
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        error: typeof error === "string" ? error : "Invalid credentials."
      }));
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
          <form
            onSubmit={(event) => handleSubmit(event, isAdmin ? "admin" : "student")}
            className="form-stack"
          >
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
            <p className="muted">Your organization administrator must create your account.</p>
          </form>
        </Card>
      </div>
    </AuthLayout>
  );
};
