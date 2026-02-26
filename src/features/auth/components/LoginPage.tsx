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

  return (
    <AuthLayout>
      <div className="login-stack">
        <div>
          <p className="eyebrow">Welcome</p>
          <h2>Sign in to continue</h2>
          <p className="muted">Choose the role that matches your workspace.</p>
        </div>
        <div className="login-grid">
          <Card className="lift">
            <h3>Admin Login</h3>
            <p className="muted">Manage syllabi, generate materials, and publish.</p>
            <form onSubmit={handleAdminSubmit} className="form-stack">
              <Input
                label="Admin Email"
                type="email"
                value={adminForm.email}
                onChange={(event) =>
                  setAdminForm((prev) => ({ ...prev, email: event.target.value, error: undefined }))
                }
                required
              />
              <Input
                label="Password"
                type="password"
                value={adminForm.password}
                onChange={(event) =>
                  setAdminForm((prev) => ({ ...prev, password: event.target.value, error: undefined }))
                }
                required
              />
              {adminForm.error ? <p className="form-error">{adminForm.error}</p> : null}
              <Button type="submit">Sign in as Admin</Button>
            </form>
          </Card>
          <Card className="lift">
            <h3>Student Login</h3>
            <p className="muted">Explore published study materials and downloads.</p>
            <form onSubmit={handleStudentSubmit} className="form-stack">
              <Input
                label="Student Email"
                type="email"
                value={studentForm.email}
                onChange={(event) =>
                  setStudentForm((prev) => ({ ...prev, email: event.target.value, error: undefined }))
                }
                required
              />
              <Input
                label="Password"
                type="password"
                value={studentForm.password}
                onChange={(event) =>
                  setStudentForm((prev) => ({ ...prev, password: event.target.value, error: undefined }))
                }
                required
              />
              {studentForm.error ? <p className="form-error">{studentForm.error}</p> : null}
              <Button type="submit" variant="secondary">
                Sign in as Student
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </AuthLayout>
  );
};
