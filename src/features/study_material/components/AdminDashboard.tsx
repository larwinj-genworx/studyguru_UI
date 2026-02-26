import React, { useEffect, useMemo, useState } from "react";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { JobProgress } from "@/features/study_material/components/JobProgress";
import {
  addConceptsBulk,
  approveJob,
  createAdminJob,
  createSubject,
  downloadAdminConceptArtifact,
  downloadAdminJobZip,
  getJobStatus,
  getSubject,
  listAdminSubjectMaterials,
  publishSubject
} from "@/features/study_material/services/studyMaterialService";
import type {
  AdminMaterialJobCreate,
  ConceptBulkCreate,
  ConceptMaterialResponse,
  MaterialJobStatusResponse,
  SubjectCreate,
  SubjectResponse
} from "@/features/study_material/types";
import {
  loadStoredJobs,
  loadStoredSubjects,
  saveStoredJobs,
  saveStoredSubjects,
  StoredSubject
} from "@/utils/storage";

interface ConceptDraft {
  name: string;
  description: string;
}

const emptyConcept: ConceptDraft = { name: "", description: "" };

export const AdminDashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<StoredSubject[]>(loadStoredSubjects());
  const [subjectDetails, setSubjectDetails] = useState<Record<string, SubjectResponse>>({});
  const [materialsMap, setMaterialsMap] = useState<Record<string, ConceptMaterialResponse[]>>({});
  const [jobMap, setJobMap] = useState<Record<string, MaterialJobStatusResponse>>({});
  const [subjectJobs, setSubjectJobs] = useState<Record<string, string>>(loadStoredJobs());
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(
    subjects[0]?.subject_id ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showConceptModal, setShowConceptModal] = useState(false);
  const [conceptDrafts, setConceptDrafts] = useState<ConceptDraft[]>([{ ...emptyConcept }]);
  const [subjectForm, setSubjectForm] = useState<SubjectCreate>({
    name: "",
    grade_level: "",
    description: ""
  });

  const activeSubject = activeSubjectId ? subjectDetails[activeSubjectId] : undefined;
  const activeJob = activeSubjectId ? jobMap[subjectJobs[activeSubjectId]] : undefined;
  const activeMaterials = activeSubjectId ? materialsMap[activeSubjectId] : undefined;

  const canPublish = useMemo(() => {
    if (!activeSubject) {
      return false;
    }
    if (!activeSubject.concepts.length) {
      return false;
    }
    return activeSubject.concepts.every((concept) =>
      ["approved", "published"].includes(concept.material_status)
    );
  }, [activeSubject]);

  const activeConceptIds = useMemo(() => {
    if (!activeSubject) {
      return [];
    }
    return activeSubject.concepts.map((concept) => concept.concept_id);
  }, [activeSubject]);

  useEffect(() => {
    saveStoredSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    saveStoredJobs(subjectJobs);
  }, [subjectJobs]);

  useEffect(() => {
    if (!subjects.length) {
      return;
    }
    const fetchSubjects = async () => {
      const updates: Record<string, SubjectResponse> = {};
      for (const subject of subjects) {
        try {
          const response = await getSubject(subject.subject_id);
          updates[subject.subject_id] = response;
        } catch (err) {
          // ignore fetch errors for now
        }
      }
      if (Object.keys(updates).length) {
        setSubjectDetails((prev) => ({ ...prev, ...updates }));
      }
    };
    fetchSubjects();
  }, [subjects]);

  useEffect(() => {
    if (!activeSubjectId) {
      return;
    }
    if (!materialsMap[activeSubjectId]) {
      listAdminSubjectMaterials(activeSubjectId)
        .then((materials) => {
          setMaterialsMap((prev) => ({ ...prev, [activeSubjectId]: materials }));
        })
        .catch(() => null);
    }
  }, [activeSubjectId, materialsMap]);

  useEffect(() => {
    const allJobIds = Object.values(subjectJobs);
    if (!allJobIds.length) {
      return;
    }
    const bootstrapJobs = async () => {
      const updates: Record<string, MaterialJobStatusResponse> = {};
      for (const jobId of allJobIds) {
        try {
          const status = await getJobStatus(jobId);
          updates[jobId] = status;
        } catch {
          // ignore missing job status
        }
      }
      if (Object.keys(updates).length) {
        setJobMap((prev) => ({ ...prev, ...updates }));
      }
    };
    bootstrapJobs();
  }, [subjectJobs]);

  useEffect(() => {
    const activeJobs = Object.values(jobMap).filter(
      (job) => job.status === "queued" || job.status === "running"
    );
    if (!activeJobs.length) {
      return;
    }

    const interval = window.setInterval(() => {
      activeJobs.forEach(async (job) => {
        try {
          const updated = await getJobStatus(job.job_id);
          setJobMap((prev) => ({ ...prev, [job.job_id]: updated }));
        } catch {
          // ignore polling errors
        }
      });
    }, 2500);

    return () => window.clearInterval(interval);
  }, [jobMap]);

  const handleCreateSubject = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await createSubject(subjectForm);
      const newEntry: StoredSubject = {
        subject_id: response.subject_id,
        name: response.name,
        grade_level: response.grade_level,
        description: response.description
      };
      setSubjects((prev) => [newEntry, ...prev]);
      setSubjectDetails((prev) => ({ ...prev, [response.subject_id]: response }));
      setActiveSubjectId(response.subject_id);
      setShowSubjectModal(false);
      setSubjectForm({ name: "", grade_level: "", description: "" });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create syllabus.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddConcepts = async () => {
    if (!activeSubjectId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: ConceptBulkCreate = {
        concepts: conceptDrafts
          .filter((draft) => draft.name.trim())
          .map((draft) => ({
            name: draft.name.trim(),
            description: draft.description.trim() || undefined
          }))
      };
      if (!payload.concepts.length) {
        setError("Add at least one topic.");
        return;
      }
      const response = await addConceptsBulk(activeSubjectId, payload);
      setSubjectDetails((prev) => ({ ...prev, [activeSubjectId]: response }));
      setShowConceptModal(false);
      setConceptDrafts([{ ...emptyConcept }]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to add topics.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMaterial = async () => {
    if (!activeSubjectId || !activeConceptIds.length) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: AdminMaterialJobCreate = {
        subject_id: activeSubjectId,
        concept_ids: activeConceptIds
      };
      const response = await createAdminJob(payload);
      setJobMap((prev) => ({ ...prev, [response.job_id]: response }));
      setSubjectJobs((prev) => ({ ...prev, [activeSubjectId]: response.job_id }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to start generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveJob = async () => {
    if (!activeJob) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await approveJob(activeJob.job_id, {
        concept_ids: activeJob.concept_ids
      });
      setJobMap((prev) => ({ ...prev, [activeJob.job_id]: response }));
      const materials = await listAdminSubjectMaterials(activeJob.subject_id);
      setMaterialsMap((prev) => ({ ...prev, [activeJob.subject_id]: materials }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Approval failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishSubject = async () => {
    if (!activeSubjectId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await publishSubject(activeSubjectId);
      setSubjectDetails((prev) => ({ ...prev, [activeSubjectId]: response }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Publish failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBundle = async () => {
    if (!activeJob) {
      return;
    }
    await downloadAdminJobZip(activeJob.job_id);
  };

  const renderSubjectList = () => {
    if (!subjects.length) {
      return (
        <EmptyState
          title="No syllabus yet"
          description="Create your first syllabus to begin generating study materials."
          action={<Button onClick={() => setShowSubjectModal(true)}>Add Syllabus</Button>}
        />
      );
    }

    return subjects.map((subject) => (
      <button
        key={subject.subject_id}
        className={`list-item ${activeSubjectId === subject.subject_id ? "active" : ""}`}
        onClick={() => setActiveSubjectId(subject.subject_id)}
      >
        <div>
          <p className="list-title">{subject.name}</p>
          <span className="list-subtitle">Grade {subject.grade_level}</span>
        </div>
      </button>
    ));
  };

  return (
    <DashboardLayout
      title="Study Material Control"
      subtitle="Create syllabi, generate materials, and publish to students."
    >
      <PageHeader
        title="Syllabus Workspace"
        subtitle="Manage each syllabus end-to-end with AI-powered generation."
        actions={
          <Button onClick={() => setShowSubjectModal(true)}>
            Add Syllabus
          </Button>
        }
      />

      {error ? <div className="alert danger">{error}</div> : null}

      <div className="grid two-col">
        <Card className="panel">
          <div className="panel-header">
            <h3>All Syllabi</h3>
            <Button variant="ghost" onClick={() => setShowSubjectModal(true)}>
              New
            </Button>
          </div>
          <div className="list-stack">{renderSubjectList()}</div>
        </Card>

        <div className="stack">
          {!activeSubject ? (
            <Card className="panel">
              <EmptyState
                title="Select a syllabus"
                description="Choose a syllabus on the left to view details and generate materials."
              />
            </Card>
          ) : (
            <Card className="panel">
              <div className="panel-header">
                <div>
                  <h3>{activeSubject.name}</h3>
                  <p className="muted">Grade {activeSubject.grade_level}</p>
                </div>
                <Badge variant={activeSubject.published ? "success" : "warning"}>
                  {activeSubject.published ? "Published" : "Draft"}
                </Badge>
              </div>
              {activeSubject.description ? <p>{activeSubject.description}</p> : null}
              <div className="section">
                <div className="section-header">
                  <h4>Topics</h4>
                  <Button variant="secondary" onClick={() => setShowConceptModal(true)}>
                    Add Topics
                  </Button>
                </div>
                {activeSubject.concepts.length ? (
                  <div className="chip-grid">
                    {activeSubject.concepts.map((concept) => (
                      <span key={concept.concept_id} className="chip">
                        {concept.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No topics yet"
                    description="Add at least one topic before generating study materials."
                  />
                )}
              </div>
              <div className="section">
                <div className="section-header">
                  <h4>Generation</h4>
                </div>
                <div className="inline-actions">
                  <Button
                    onClick={handleGenerateMaterial}
                    disabled={!activeSubject.concepts.length || loading}
                  >
                    Generate Study Material
                  </Button>
                  {activeJob?.status === "completed" ? (
                    <Button variant="secondary" onClick={handleDownloadBundle}>
                      Download Bundle
                    </Button>
                  ) : null}
                </div>
                {activeJob ? <JobProgress job={activeJob} /> : null}
                {activeJob?.status === "completed" && activeJob.review_status !== "approved" ? (
                  <div className="inline-actions">
                    <Button variant="secondary" onClick={handleApproveJob}>
                      Approve Materials
                    </Button>
                  </div>
                ) : null}
                {activeSubject.published ? null : (
                  <div className="inline-actions">
                    <Button variant="ghost" onClick={handlePublishSubject} disabled={!canPublish}>
                      Publish to Students
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="panel">
            <div className="panel-header">
              <h3>Generated Materials</h3>
            </div>
            {activeMaterials && activeMaterials.length ? (
              <div className="material-list">
                {activeMaterials.map((material) => (
                  <div key={material.concept_id} className="material-card">
                    <div>
                      <h4>{material.concept_name}</h4>
                      <p className="muted">Version {material.version}</p>
                    </div>
                    <div className="inline-actions">
                      {activeJob ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            downloadAdminConceptArtifact(
                              activeJob.job_id,
                              material.concept_id,
                              "pdf"
                            )
                          }
                        >
                          PDF
                        </Button>
                      ) : null}
                      {activeJob ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            downloadAdminConceptArtifact(
                              activeJob.job_id,
                              material.concept_id,
                              "pptx"
                            )
                          }
                        >
                          PPTX
                        </Button>
                      ) : null}
                      {activeJob ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            downloadAdminConceptArtifact(
                              activeJob.job_id,
                              material.concept_id,
                              "docx"
                            )
                          }
                        >
                          DOCX
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No materials yet"
                description="Generate and approve materials to see them listed here."
              />
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={showSubjectModal}
        title="Add Syllabus"
        onClose={() => setShowSubjectModal(false)}
        footer={
          <div className="inline-actions">
            <Button variant="ghost" onClick={() => setShowSubjectModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubject} disabled={loading}>
              {loading ? "Saving..." : "Create Syllabus"}
            </Button>
          </div>
        }
      >
        <div className="form-stack">
          <Input
            label="Syllabus Name"
            value={subjectForm.name}
            onChange={(event) => setSubjectForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <Input
            label="Grade Level"
            value={subjectForm.grade_level}
            onChange={(event) =>
              setSubjectForm((prev) => ({ ...prev, grade_level: event.target.value }))
            }
            required
          />
          <TextArea
            label="Description"
            value={subjectForm.description || ""}
            onChange={(event) =>
              setSubjectForm((prev) => ({ ...prev, description: event.target.value }))
            }
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        open={showConceptModal}
        title="Add Topics"
        onClose={() => setShowConceptModal(false)}
        footer={
          <div className="inline-actions">
            <Button variant="ghost" onClick={() => setShowConceptModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddConcepts} disabled={loading}>
              {loading ? "Saving..." : "Add Topics"}
            </Button>
          </div>
        }
      >
        <div className="stack">
          {conceptDrafts.map((draft, index) => (
            <Card key={index} className="subtle">
              <div className="form-stack">
                <Input
                  label={`Topic ${index + 1}`}
                  value={draft.name}
                  onChange={(event) => {
                    const updated = [...conceptDrafts];
                    updated[index] = { ...draft, name: event.target.value };
                    setConceptDrafts(updated);
                  }}
                  required
                />
                <TextArea
                  label="Description"
                  value={draft.description}
                  onChange={(event) => {
                    const updated = [...conceptDrafts];
                    updated[index] = { ...draft, description: event.target.value };
                    setConceptDrafts(updated);
                  }}
                  rows={2}
                />
                {conceptDrafts.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setConceptDrafts((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
          <Button
            variant="secondary"
            onClick={() => setConceptDrafts((prev) => [...prev, { ...emptyConcept }])}
          >
            Add Another Topic
          </Button>
        </div>
      </Modal>

      {loading ? (
        <div className="loading-overlay">
          <LoadingSpinner />
        </div>
      ) : null}
    </DashboardLayout>
  );
};
