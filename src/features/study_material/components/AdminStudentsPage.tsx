import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AdminStudentManager } from "@/features/study_material/components/AdminStudentManager";
import { listAdminSubjects } from "@/features/study_material/services/studyMaterialService";
import type { SubjectResponse } from "@/features/study_material/types";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const AdminStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listAdminSubjects();
        setSubjects(response);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load organization courses.");
      } finally {
        setLoading(false);
      }
    };

    void loadSubjects();
  }, []);

  return (
    <DashboardLayout
      title="Student Hub"
      subtitle="Search students, review access, and open detailed progress tracking."
      showHeader={false}
    >
      <div className="student-hub-page">
        <PageHeader
          title="Student Hub"
          subtitle="Manage student accounts in a dedicated workspace with organization-wide course visibility and direct progress tracking."
          actions={
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              Open Syllabus Workspace
            </Button>
          }
        />

        {error ? <div className="alert danger">{error}</div> : null}

        {loading ? (
          <Card className="panel student-hub-loading-card">
            <div className="inline-loading">
              <LoadingSpinner />
            </div>
          </Card>
        ) : (
          <AdminStudentManager subjects={subjects} mode="page" />
        )}
      </div>
    </DashboardLayout>
  );
};
