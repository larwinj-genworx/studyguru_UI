import React, { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  createAdminStudent,
  listAdminStudents,
  updateAdminStudent
} from "@/features/study_material/services/studyMaterialService";
import type {
  AdminManagedStudentResponse,
  SubjectResponse
} from "@/features/study_material/types";

interface AdminStudentManagerProps {
  subjects: SubjectResponse[];
  activeSubjectId?: string | null;
  onRosterUpdated?: () => Promise<void> | void;
  mode?: "panel" | "page";
}

interface StudentFormState {
  email: string;
  password: string;
  is_active: boolean;
}

const createEmptyForm = (): StudentFormState => ({
  email: "",
  password: "",
  is_active: true
});

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "No activity yet";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "No activity yet";
  }
  return parsed.toLocaleString();
};

const openActivityTab = (subjectId: string, studentId: string) => {
  const url = `${window.location.origin}/admin/subjects/${subjectId}/students/${studentId}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

export const AdminStudentManager: React.FC<AdminStudentManagerProps> = ({
  subjects,
  activeSubjectId,
  onRosterUpdated,
  mode = "panel"
}) => {
  const [students, setStudents] = useState<AdminManagedStudentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AdminManagedStudentResponse | null>(null);
  const [form, setForm] = useState<StudentFormState>(createEmptyForm());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await listAdminStudents();
      setStudents(response);
      setPanelError(null);
      setSelectedStudentId((current) =>
        current && response.some((student) => student.user_id === current)
          ? current
          : response[0]?.user_id ?? null
      );
    } catch (error: any) {
      setPanelError(error?.response?.data?.detail || "Failed to load student accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return students.filter((student) => {
      if (statusFilter === "active" && !student.is_active) {
        return false;
      }
      if (statusFilter === "inactive" && student.is_active) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = [
        student.email,
        ...student.assigned_subjects.map((subject) => subject.name)
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [searchQuery, statusFilter, students]);

  useEffect(() => {
    if (!filteredStudents.length) {
      setSelectedStudentId(null);
      return;
    }
    if (!selectedStudentId || !filteredStudents.some((student) => student.user_id === selectedStudentId)) {
      setSelectedStudentId(filteredStudents[0].user_id);
    }
  }, [filteredStudents, selectedStudentId]);

  const selectedStudent =
    filteredStudents.find((student) => student.user_id === selectedStudentId) ??
    filteredStudents[0] ??
    null;

  const activeStudentCount = useMemo(
    () => students.filter((student) => student.is_active).length,
    [students]
  );
  const publishedSubjectCount = useMemo(
    () => subjects.filter((subject) => subject.published).length,
    [subjects]
  );
  const activeSubjectCoverage = useMemo(() => {
    if (!activeSubjectId) {
      return 0;
    }
    return students.filter((student) =>
      student.assigned_subjects.some((subject) => subject.subject_id === activeSubjectId)
    ).length;
  }, [activeSubjectId, students]);

  const resetModal = () => {
    setEditingStudent(null);
    setForm(createEmptyForm());
    setModalError(null);
    setModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    setForm(createEmptyForm());
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (student: AdminManagedStudentResponse) => {
    setEditingStudent(student);
    setForm({
      email: student.email,
      password: "",
      is_active: student.is_active
    });
    setModalError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setModalError(null);
    if (!editingStudent && !form.email.trim()) {
      setModalError("Student email is required.");
      return;
    }
    if (!editingStudent && form.password.trim().length < 6) {
      setModalError("Password must be at least 6 characters.");
      return;
    }
    if (editingStudent && form.password && form.password.trim().length < 6) {
      setModalError("New password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingStudent) {
        await updateAdminStudent(editingStudent.user_id, {
          is_active: form.is_active,
          password: form.password.trim() ? form.password : undefined
        });
      } else {
        await createAdminStudent({
          email: form.email.trim(),
          password: form.password
        });
      }
      await loadStudents();
      if (onRosterUpdated) {
        await onRosterUpdated();
      }
      resetModal();
    } catch (error: any) {
      setModalError(error?.response?.data?.detail || "Failed to save student access.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStudentSummaryCards = () => (
    <div className="managed-student-grid">
      {filteredStudents.map((student) => {
        const hasActiveSubject =
          activeSubjectId &&
          student.assigned_subjects.some((subject) => subject.subject_id === activeSubjectId);
        return (
          <Card key={student.user_id} className="managed-student-card">
            <div className="managed-student-header">
              <div>
                <h4>{student.email}</h4>
                <p className="muted">Last login {formatDateTime(student.last_login_at)}</p>
              </div>
              <div className="inline-actions">
                <Badge variant={student.is_active ? "success" : "warning"}>
                  {student.is_active ? "Active" : "Inactive"}
                </Badge>
                {hasActiveSubject ? <Badge variant="info">Current course</Badge> : null}
              </div>
            </div>
            <div className="managed-student-metrics">
              <div>
                <span>Visible courses</span>
                <strong>{student.assigned_subjects.length}</strong>
              </div>
              <div>
                <span>Created</span>
                <strong>{formatDateTime(student.created_at)}</strong>
              </div>
            </div>
            <div className="managed-student-subjects">
              {student.assigned_subjects.length ? (
                student.assigned_subjects.map((subject) => (
                  <span key={`${student.user_id}-${subject.subject_id}`} className="subject-chip">
                    {subject.name}
                  </span>
                ))
              ) : (
                <p className="muted">Courses will appear here once they are created and published.</p>
              )}
            </div>
            <div className="managed-student-footer">
              {activeSubjectId ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openActivityTab(activeSubjectId, student.user_id)}
                >
                  Open Current Activity
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={() => openEditModal(student)}>
                Manage Access
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderPageView = () => (
    <>
      <div className="student-hub-stats">
        <Card className="student-hub-stat-card">
          <span>Total Students</span>
          <strong>{students.length}</strong>
          <p className="muted">All student accounts in this organization.</p>
        </Card>
        <Card className="student-hub-stat-card">
          <span>Active Accounts</span>
          <strong>{activeStudentCount}</strong>
          <p className="muted">Students who can currently sign in.</p>
        </Card>
        <Card className="student-hub-stat-card">
          <span>Published Courses</span>
          <strong>{publishedSubjectCount}</strong>
          <p className="muted">Visible to every student in this organization.</p>
        </Card>
        <Card className="student-hub-stat-card">
          <span>Current Course Reach</span>
          <strong>{activeSubjectId ? activeSubjectCoverage : students.length}</strong>
          <p className="muted">
            {activeSubjectId
              ? "Students who can access the course open in the workspace."
              : "Students currently covered by the organization-wide access model."}
          </p>
        </Card>
      </div>

      <div className="student-hub-toolbar">
        <Input
          label="Search Students"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by email or course name"
        />
        <div className="student-hub-filter-group">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "secondary" : "ghost"}
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "active" ? "secondary" : "ghost"}
            onClick={() => setStatusFilter("active")}
          >
            Active
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "inactive" ? "secondary" : "ghost"}
            onClick={() => setStatusFilter("inactive")}
          >
            Inactive
          </Button>
        </div>
      </div>

      {filteredStudents.length ? (
        <div className="student-hub-layout">
          <div className="student-hub-roster">
            {filteredStudents.map((student) => (
              <button
                key={student.user_id}
                type="button"
                className={`student-hub-roster-item ${
                  selectedStudent?.user_id === student.user_id ? "active" : ""
                }`}
                onClick={() => setSelectedStudentId(student.user_id)}
              >
                <div>
                  <p className="student-hub-roster-name">{student.email}</p>
                  <span className="student-hub-roster-meta">
                    {student.assigned_subjects.length} courses • Last login {formatDateTime(student.last_login_at)}
                  </span>
                </div>
                <Badge variant={student.is_active ? "success" : "warning"}>
                  {student.is_active ? "Active" : "Inactive"}
                </Badge>
              </button>
            ))}
          </div>
          <Card className="student-hub-detail-card">
            {selectedStudent ? (
              <>
                <div className="student-hub-detail-header">
                  <div>
                    <p className="eyebrow">Student Profile</p>
                    <h3>{selectedStudent.email}</h3>
                    <p className="muted">
                      Created {formatDateTime(selectedStudent.created_at)} • Last login{" "}
                      {formatDateTime(selectedStudent.last_login_at)}
                    </p>
                  </div>
                  <div className="inline-actions">
                    <Badge variant={selectedStudent.is_active ? "success" : "warning"}>
                      {selectedStudent.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(selectedStudent)}>
                      Manage Access
                    </Button>
                  </div>
                </div>

                <div className="student-hub-detail-grid">
                  <div className="student-hub-detail-metric">
                    <span>Visible Courses</span>
                    <strong>{selectedStudent.assigned_subjects.length}</strong>
                  </div>
                  <div className="student-hub-detail-metric">
                    <span>Published Courses</span>
                    <strong>
                      {selectedStudent.assigned_subjects.filter((subject) => subject.published).length}
                    </strong>
                  </div>
                  <div className="student-hub-detail-metric">
                    <span>Draft Courses</span>
                    <strong>
                      {selectedStudent.assigned_subjects.filter((subject) => !subject.published).length}
                    </strong>
                  </div>
                </div>

                <div className="student-hub-detail-section">
                  <div className="student-hub-detail-section-head">
                    <h4>Course Access</h4>
                    <p className="muted">
                      Every student automatically receives access to every course created in this organization.
                    </p>
                  </div>
                  {selectedStudent.assigned_subjects.length ? (
                    <div className="student-hub-subject-list">
                      {selectedStudent.assigned_subjects.map((subject) => (
                        <div key={`${selectedStudent.user_id}-${subject.subject_id}`} className="student-hub-subject-row">
                          <div>
                            <p className="student-hub-subject-title">{subject.name}</p>
                            <span className="student-hub-subject-meta">
                              {subject.published ? "Published and live to students" : "Draft - awaiting publish"}
                            </span>
                          </div>
                          <div className="inline-actions">
                            <Badge variant={subject.published ? "success" : "warning"}>
                              {subject.published ? "Published" : "Draft"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openActivityTab(subject.subject_id, selectedStudent.user_id)}
                            >
                              View Activity
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No courses visible yet"
                      description="As new courses are created in this organization, they will appear here automatically."
                    />
                  )}
                </div>
              </>
            ) : (
              <EmptyState
                title="Select a student"
                description="Choose a student from the roster to inspect access and open activity tracking."
              />
            )}
          </Card>
        </div>
      ) : (
        <EmptyState
          title="No students matched your search"
          description="Try a different email or switch the activity filter."
        />
      )}
    </>
  );

  return (
    <Card className={`panel ${mode === "page" ? "admin-student-manager-page" : "admin-student-manager-panel"}`}>
      <div className="panel-header">
        <div>
          <h3>{mode === "page" ? "Student Hub" : "Organization Students"}</h3>
          <p className="muted">
            {mode === "page"
              ? "Search every student, review course access, and open detailed learning activity in a dedicated workspace."
              : "Create student accounts and keep login access under organization control."}
          </p>
        </div>
        <div className="inline-actions">
          <Badge variant={students.length ? "info" : "neutral"}>{students.length} students</Badge>
          <Badge variant={activeStudentCount ? "success" : "neutral"}>
            {activeStudentCount} active
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => void loadStudents()} disabled={loading}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={openCreateModal}>
            Add Student
          </Button>
        </div>
      </div>
      {panelError ? <div className="alert danger">{panelError}</div> : null}

      {loading ? (
        <div className="inline-loading">
          <div className="spinner" aria-hidden="true">
            <div />
            <div />
            <div />
          </div>
        </div>
      ) : students.length ? (
        mode === "page" ? renderPageView() : renderStudentSummaryCards()
      ) : (
        <EmptyState
          title="No students created yet"
          description="Create student accounts here. Every course in this organization will appear for them automatically, and published content becomes available immediately."
        />
      )}

      <Modal
        open={modalOpen}
        title={editingStudent ? "Manage Student Access" : "Create Student Account"}
        onClose={resetModal}
        footer={
          <div className="inline-actions">
            <Button variant="ghost" onClick={resetModal} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? editingStudent
                  ? "Saving..."
                  : "Creating..."
                : editingStudent
                  ? "Save Changes"
                  : "Create Student"}
            </Button>
          </div>
        }
      >
        <div className="managed-student-form">
          <Input
            label="Student Email"
            type="email"
            value={form.email}
            disabled={Boolean(editingStudent)}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
          />
          <Input
            label={editingStudent ? "Reset Password" : "Initial Password"}
            type="password"
            value={form.password}
            placeholder={editingStudent ? "Leave blank to keep the current password" : ""}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
          />
          {editingStudent ? (
            <label className="managed-student-toggle">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                }
              />
              <span />
              <div>
                <strong>Allow this student to log in</strong>
                <p className="muted">Disable access without removing their progress history.</p>
              </div>
            </label>
          ) : null}
          <div className="managed-student-assignment">
            <div className="managed-student-assignment-header">
              <h4>Organization-Wide Course Access</h4>
              <p className="muted">
                Every course created in this organization appears for all active students automatically, and published content becomes available immediately.
              </p>
            </div>
            <div className="managed-student-auto-access-note">
              <span>Course coverage</span>
              <strong>
                {publishedSubjectCount} published / {subjects.length} total
              </strong>
            </div>
          </div>
          {modalError ? <div className="alert danger">{modalError}</div> : null}
        </div>
      </Modal>
    </Card>
  );
};
