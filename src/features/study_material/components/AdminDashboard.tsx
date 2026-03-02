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
  MaterialPreviewModal,
  type PreviewFileType
} from "@/features/study_material/components/MaterialPreviewModal";
import {
  addConceptsBulk,
  approveJob,
  createAdminJob,
  createSubject,
  downloadAdminJobZip,
  fetchAdminConceptArtifact,
  getJobStatus,
  getSubject,
  listAdminJobs,
  listAdminSubjects,
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


interface ConceptDraft {
  name: string;
  description: string;
}

const emptyConcept: ConceptDraft = { name: "", description: "" };

export const AdminDashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [materialsMap, setMaterialsMap] = useState<Record<string, ConceptMaterialResponse[]>>({});
  const [jobMap, setJobMap] = useState<Record<string, MaterialJobStatusResponse>>({});
  const [subjectJobs, setSubjectJobs] = useState<Record<string, string>>({});
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
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

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<{
    title: string;
    fileName: string;
    fileType: PreviewFileType;
  } | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const activeSubject = activeSubjectId
    ? subjects.find((subject) => subject.subject_id === activeSubjectId)
    : undefined;
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
    setPreviewOpen(false);
    setPreviewBlob(null);
    setPreviewError(null);
  }, [activeSubjectId]);

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listAdminSubjects();
        setSubjects(response);
        if (response.length) {
          setActiveSubjectId((current) => current ?? response[0].subject_id);
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load syllabi.");
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

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
    if (!subjects.length) {
      setJobMap({});
      setSubjectJobs({});
      return;
    }
    const fetchJobs = async () => {
      try {
        const jobs = await listAdminJobs();
        const updates: Record<string, MaterialJobStatusResponse> = {};
        const latestBySubject: Record<string, MaterialJobStatusResponse> = {};
        jobs.forEach((job) => {
          updates[job.job_id] = job;
          const current = latestBySubject[job.subject_id];
          if (!current || new Date(job.created_at) > new Date(current.created_at)) {
            latestBySubject[job.subject_id] = job;
          }
        });
        setJobMap(updates);
        setSubjectJobs(
          Object.fromEntries(
            Object.entries(latestBySubject).map(([subjectId, job]) => [
              subjectId,
              job.job_id
            ])
          )
        );
      } catch {
        // ignore fetch errors
      }
    };
    fetchJobs();
  }, [subjects]);

  useEffect(() => {
    // Intentionally disabled auto-polling. Status updates should be user-triggered.
  }, [jobMap]);

  const handleRefreshJobStatus = async () => {
    if (!activeJob) {
      return;
    }
    try {
      const updated = await getJobStatus(activeJob.job_id);
      setJobMap((prev) => ({ ...prev, [activeJob.job_id]: updated }));
    } catch {
      // ignore refresh errors
    }
  };

  const handleCreateSubject = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await createSubject(subjectForm);
      setSubjects((prev) => [response, ...prev]);
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
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.subject_id === activeSubjectId ? response : subject
        )
      );
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
      const refreshed = await getSubject(activeJob.subject_id);
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.subject_id === activeJob.subject_id ? refreshed : subject
        )
      );
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
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.subject_id === activeSubjectId ? response : subject
        )
      );
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

  const toSafeFilename = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return slug || "material";
  };

  const openPreview = async (options: {
    title: string;
    fileName: string;
    fileType: PreviewFileType;
    fetcher: () => Promise<Blob>;
  }) => {
    setPreviewOpen(true);
    setPreviewMeta({ title: options.title, fileName: options.fileName, fileType: options.fileType });
    setPreviewBlob(null);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const blob = await options.fetcher();
      setPreviewBlob(blob);
    } catch (err: any) {
      setPreviewError(err?.response?.data?.detail || "Failed to load preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewMeta(null);
    setPreviewBlob(null);
    setPreviewLoading(false);
    setPreviewError(null);
  };

  const handlePreviewMaterial = async (options: {
    conceptId: string;
    conceptName: string;
    jobId: string;
    artifactName: string;
    fileType: PreviewFileType;
  }) => {
    if (!options.jobId) {
      setError("This material is missing a source job. Please regenerate the topic.");
      return;
    }
    const extension =
      options.fileType === "video"
        ? options.artifactName.split(".").pop() || "mp4"
        : options.fileType;
    const fileName = `${toSafeFilename(options.conceptName)}.${extension}`;
    await openPreview({
      title: `${options.conceptName} · ${options.fileType.toUpperCase()}`,
      fileName,
      fileType: options.fileType,
      fetcher: () => fetchAdminConceptArtifact(options.jobId, options.conceptId, options.artifactName)
    });
  };

  const getVideoArtifactKeys = (artifactIndex?: ConceptMaterialResponse["artifact_index"]) => {
    if (!artifactIndex?.extras) {
      return [];
    }
    return Object.keys(artifactIndex.extras).filter((key) =>
      /video|mp4|webm|mov/i.test(key)
    );
  };

  const renderArtifactActions = (options: {
    conceptId: string;
    conceptName: string;
    jobId: string;
    artifactIndex: ConceptMaterialResponse["artifact_index"];
  }) => {
    const videoKeys = getVideoArtifactKeys(options.artifactIndex);
    const hasPreview =
      Boolean(options.artifactIndex.pdf) ||
      Boolean(options.artifactIndex.quick_revision_pdf) ||
      videoKeys.length > 0;

    if (!hasPreview) {
      return <span className="muted">No previewable files yet.</span>;
    }

    return (
      <div className="inline-actions">
        {options.artifactIndex.pdf ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              handlePreviewMaterial({
                conceptId: options.conceptId,
                conceptName: options.conceptName,
                jobId: options.jobId,
                artifactName: "pdf",
                fileType: "pdf"
              })
            }
          >
            View Study PDF
          </Button>
        ) : null}
        {options.artifactIndex.quick_revision_pdf ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              handlePreviewMaterial({
                conceptId: options.conceptId,
                conceptName: options.conceptName,
                jobId: options.jobId,
                artifactName: "quick_revision_pdf",
                fileType: "pdf"
              })
            }
          >
            Quick Revision
          </Button>
        ) : null}
        {videoKeys.map((key, index) => (
          <Button
            key={key}
            size="sm"
            variant="ghost"
            onClick={() =>
              handlePreviewMaterial({
                conceptId: options.conceptId,
                conceptName: options.conceptName,
                jobId: options.jobId,
                artifactName: key,
                fileType: "video"
              })
            }
          >
            {videoKeys.length > 1 ? `Video ${index + 1}` : "Video"}
          </Button>
        ))}
      </div>
    );
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
                  {activeJob ? (
                    <Button variant="ghost" onClick={handleRefreshJobStatus}>
                      Refresh Status
                    </Button>
                  ) : null}
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
            {activeJob?.status === "completed" && activeJob.review_status !== "approved" ? (
              <div className="review-note">
                Review the generated materials below before approving.
              </div>
            ) : null}
            {activeMaterials && activeMaterials.length ? (
              <div className="material-list">
                {activeMaterials.map((material) => (
                  <div key={material.concept_id} className="material-card">
                    <div>
                      <h4>{material.concept_name}</h4>
                      <p className="muted">Version {material.version}</p>
                    </div>
                    {renderArtifactActions({
                      conceptId: material.concept_id,
                      conceptName: material.concept_name,
                      jobId: material.source_job_id,
                      artifactIndex: material.artifact_index
                    })}
                  </div>
                ))}
              </div>
            ) : activeJob?.status === "completed" && activeSubject ? (
              <div className="material-list">
                {activeSubject.concepts.map((concept) => {
                  const artifacts = activeJob.concept_artifacts[concept.concept_id];
                  if (!artifacts) {
                    return null;
                  }
                  return (
                    <div key={concept.concept_id} className="material-card">
                      <div>
                        <h4>{concept.name}</h4>
                        <p className="muted">Ready for review</p>
                      </div>
                      {renderArtifactActions({
                        conceptId: concept.concept_id,
                        conceptName: concept.name,
                        jobId: activeJob.job_id,
                        artifactIndex: artifacts
                      })}
                    </div>
                  );
                })}
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

      <MaterialPreviewModal
        open={previewOpen}
        title={previewMeta?.title ?? "Material Preview"}
        fileName={previewMeta?.fileName ?? "material"}
        fileType={previewMeta?.fileType ?? "pdf"}
        previewBlob={previewBlob}
        loading={previewLoading}
        error={previewError}
        onClose={handleClosePreview}
      />

      {loading ? (
        <div className="loading-overlay">
          <LoadingSpinner />
        </div>
      ) : null}
    </DashboardLayout>
  );
};
