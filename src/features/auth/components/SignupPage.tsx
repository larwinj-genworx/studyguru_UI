import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthLayout } from "@/layouts/AuthLayout";
import { signupUser } from "@/features/auth/slices/authThunks";
import { useAppDispatch } from "@/hooks/useAppDispatch";

interface SignupFormState {
  email: string;
  password: string;
  confirmPassword: string;
  error?: string;
}

const emptyForm: SignupFormState = {
  email: "",
  password: "",
  confirmPassword: ""
};

export const SignupPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [adminForm, setAdminForm] = useState<SignupFormState>({ ...emptyForm });
  const [studentForm, setStudentForm] = useState<SignupFormState>({ ...emptyForm });
  const [activeRole, setActiveRole] = useState<"admin" | "student">("admin");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
    role: "admin" | "student"
  ) => {
    event.preventDefault();
    const form = role === "admin" ? adminForm : studentForm;
    const setForm = role === "admin" ? setAdminForm : setStudentForm;

    if (form.password !== form.confirmPassword) {
      setForm((prev) => ({ ...prev, error: "Passwords do not match." }));
      return;
    }

    try {
      const user = await dispatch(
        signupUser({
          email: form.email.trim(),
          password: form.password,
          role
        })
      ).unwrap();

      navigate(user.role === "admin" ? "/admin" : "/student");
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        error: typeof error === "string" ? error : "Signup failed."
      }));
    }
  };

  const isAdmin = activeRole === "admin";
  const activeForm = isAdmin ? adminForm : studentForm;
  const setActiveForm = isAdmin ? setAdminForm : setStudentForm;
  const roleTitle = isAdmin ? "Admin Signup" : "Student Signup";
  const roleDescription = isAdmin
    ? "Create your admin workspace to manage syllabi."
    : "Create your student profile to access published materials.";
  const roleCta = isAdmin ? "Create Admin Account" : "Create Student Account";

  return (
    <AuthLayout>
      <div className="login-stack">
        <div>
          <p className="eyebrow">Get Started</p>
          <h2>Create your account</h2>
          <p className="muted">Choose your role to finish setup.</p>
        </div>
        <Card className="login-card">
          <div className="login-switch" role="tablist" aria-label="Select signup role">
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
            <Input
              label="Confirm Password"
              type="password"
              value={activeForm.confirmPassword}
              onChange={(event) =>
                setActiveForm((prev) => ({
                  ...prev,
                  confirmPassword: event.target.value,
                  error: undefined
                }))
              }
              required
            />
            {activeForm.error ? <p className="form-error">{activeForm.error}</p> : null}
            <Button type="submit" variant={isAdmin ? "primary" : "secondary"}>
              {roleCta}
            </Button>
            <p className="muted">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </Card>
      </div>
    </AuthLayout>
  );
};
