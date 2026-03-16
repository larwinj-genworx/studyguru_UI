import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { ConceptImageReviewModal } from "@/features/study_material/components/ConceptImageReviewModal";
import {
  AdminTopicPlanner,
  type TopicPlannerDraft
} from "@/features/study_material/components/AdminTopicPlanner";
import {
  MaterialPreviewModal,
  type PreviewFileType
} from "@/features/study_material/components/MaterialPreviewModal";
import {
  approveJob,
  createAdminJob,
  createSubject,
  downloadApprovedMaterialsBundle,
  deleteSubject,
  fetchAdminConceptArtifact,
  getJobStatus,
  getSubject,
  listAdminJobs,
  listAdminSubjects,
  listAdminSubjectMaterials,
  getAdminConceptResources,
  refreshAdminConceptVideo,
  approveAdminConceptVideo,
  discardJobConcept,
  publishSubject,
  publishSelectedConcepts,
  saveAdminConceptPlan,
  unpublishSubject
} from "@/features/study_material/services/studyMaterialService";
import type {
  AdminConceptPlanUpdateRequest,
  AdminMaterialJobCreate,
  AdminMaterialPublishRequest,
  ConceptMaterialResponse,
  ConceptResourcesResponse,
  MaterialJobStatusResponse,
  ResourceItem,
  SubjectCreate,
  SubjectResponse
} from "@/features/study_material/types";

interface PendingReviewGroup {
  job: MaterialJobStatusResponse;
  items: Array<{
    conceptId: string;
    conceptName: string;
    artifacts: ConceptMaterialResponse["artifact_index"];
  }>;
}

const createTopicPlannerDraft = (
  partial: Partial<TopicPlannerDraft> = {}
): TopicPlannerDraft => ({
  client_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  description: "",
  pass_percentage: 70,
  is_existing: false,
  ...partial
});

const mapConceptToPlannerDraft = (
  concept: SubjectResponse["concepts"][number]
): TopicPlannerDraft =>
  createTopicPlannerDraft({
    client_id: `concept-${concept.concept_id}`,
    concept_id: concept.concept_id,
    name: concept.name,
    description: concept.description || "",
    pass_percentage: concept.pass_percentage,
    is_existing: true
  });

const isPendingReviewGroup = (
  value: PendingReviewGroup | null
): value is PendingReviewGroup => value !== null;

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
  const [conceptDrafts, setConceptDrafts] = useState<TopicPlannerDraft[]>([
    createTopicPlannerDraft()
  ]);
  const [subjectForm, setSubjectForm] = useState<SubjectCreate>({
    name: "",
    grade_level: "",
    description: ""
  });
  const [subjectQuery, setSubjectQuery] = useState("");
  const [selectedConceptIds, setSelectedConceptIds] = useState<Set<string>>(new Set());

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<{
    title: string;
    fileName: string;
    fileType: PreviewFileType;
  } | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [resourcesMeta, setResourcesMeta] = useState<{
    conceptId: string;
    conceptName: string;
  } | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<{
    title: string;
    embedUrl: string;
  } | null>(null);
  const [videoActionLoading, setVideoActionLoading] = useState(false);
  const [approvedVideoId, setApprovedVideoId] = useState<string | null>(null);
  const [imageReviewMeta, setImageReviewMeta] = useState<{
    conceptId: string;
    conceptName: string;
  } | null>(null);
  const [reviewDeleteOpen, setReviewDeleteOpen] = useState(false);
  const [reviewDeleteMeta, setReviewDeleteMeta] = useState<{
    jobId: string;
    conceptId: string;
    conceptName: string;
  } | null>(null);
  const jobStatusRef = useRef<string | null>(null);

  const activeSubject = activeSubjectId
    ? subjects.find((subject) => subject.subject_id === activeSubjectId)
    : undefined;
  const buildConceptPlannerDrafts = useCallback(
    (subject?: SubjectResponse) => {
      if (!subject?.concepts.length) {
        return [createTopicPlannerDraft()];
      }
      return [...subject.concepts]
        .sort((left, right) => left.topic_order - right.topic_order)
        .map(mapConceptToPlannerDraft);
    },
    []
  );
  const activeJob = activeSubjectId ? jobMap[subjectJobs[activeSubjectId]] : undefined;
  const activeJobId = activeJob?.job_id;
  const activeJobStatus = activeJob?.status;
  const activeMaterials = activeSubjectId ? materialsMap[activeSubjectId] : undefined;
  const latestMaterialMap = useMemo(() => {
    const map: Record<string, ConceptMaterialResponse> = {};
    (activeMaterials || []).forEach((material) => {
      map[material.concept_id] = material;
    });
    return map;
  }, [activeMaterials]);
  const resolveConceptStatus = useCallback(
    (concept: SubjectResponse["concepts"][number]) => {
      const material = latestMaterialMap[concept.concept_id];
      return material?.lifecycle_status ?? concept.material_status;
    },
    [latestMaterialMap]
  );
  const approvedMaterials = useMemo(() => {
    if (!activeMaterials) {
      return [];
    }
    return activeMaterials.filter((material) =>
      ["approved", "published"].includes(material.lifecycle_status)
    );
  }, [activeMaterials]);
  const hasRunningJobs = useMemo(() => {
    if (!activeSubjectId) {
      return false;
    }
    return Object.values(jobMap).some(
      (job) =>
        job.subject_id === activeSubjectId &&
        ["queued", "running"].includes(job.status)
    );
  }, [activeSubjectId, jobMap]);

  const canPublishAll = useMemo(() => {
    if (!activeSubject) {
      return false;
    }
    if (!activeSubject.concepts.length) {
      return false;
    }
    return activeSubject.concepts.every((concept) =>
      ["approved", "published"].includes(resolveConceptStatus(concept))
    );
  }, [activeSubject, resolveConceptStatus]);

  const selectedConcepts = useMemo(() => {
    if (!activeSubject) {
      return [];
    }
    return activeSubject.concepts.filter((concept) =>
      selectedConceptIds.has(concept.concept_id)
    );
  }, [activeSubject, selectedConceptIds]);

  const canPublishSelected = useMemo(() => {
    if (!selectedConcepts.length) {
      return false;
    }
    return selectedConcepts.every((concept) =>
      ["approved", "published"].includes(resolveConceptStatus(concept))
    );
  }, [selectedConcepts, resolveConceptStatus]);

  const activeConceptIds = useMemo(() => {
    if (!activeSubject) {
      return [];
    }
    return activeSubject.concepts.map((concept) => concept.concept_id);
  }, [activeSubject]);

  const generatedConceptIds = useMemo(() => {
    if (!activeSubjectId) {
      return new Set<string>();
    }
    const generated = new Set<string>();
    Object.values(jobMap).forEach((job) => {
      if (job.subject_id !== activeSubjectId) {
        return;
      }
      if (job.status !== "completed") {
        return;
      }
      job.concept_ids?.forEach((conceptId) => {
        generated.add(conceptId);
      });
    });
    return generated;
  }, [activeSubjectId, jobMap]);

  const ungeneratedConceptIds = useMemo(() => {
    if (!activeSubject) {
      return [];
    }
    return activeSubject.concepts
      .filter(
        (concept) =>
          concept.material_status === "unavailable" &&
          !generatedConceptIds.has(concept.concept_id)
      )
      .map((concept) => concept.concept_id);
  }, [activeSubject, generatedConceptIds]);

  const allGenerated = useMemo(() => {
    if (!activeSubject || !activeSubject.concepts.length) {
      return false;
    }
    return activeSubject.concepts.every(
      (concept) =>
        concept.material_status !== "unavailable" ||
        generatedConceptIds.has(concept.concept_id)
    );
  }, [activeSubject, generatedConceptIds]);

  const conceptNameMap = useMemo(() => {
    if (!activeSubject) {
      return {};
    }
    return Object.fromEntries(
      activeSubject.concepts.map((concept) => [concept.concept_id, concept.name])
    );
  }, [activeSubject]);

  const pendingReviewGroups = useMemo(() => {
    if (!activeSubjectId || !activeMaterials) {
      return [];
    }
    const draftMaterials = activeMaterials.filter(
      (material) => material.lifecycle_status === "draft"
    );
    const grouped: Record<string, typeof draftMaterials> = {};
    draftMaterials.forEach((material) => {
      const jobId = material.source_job_id;
      if (!jobId) {
        return;
      }
      if (!grouped[jobId]) {
        grouped[jobId] = [];
      }
      grouped[jobId].push(material);
    });
    return Object.entries(grouped)
      .map(([jobId, materials]) => {
        const job = jobMap[jobId];
        if (!job || job.status !== "completed") {
          return null;
        }
        const items = materials.map((material) => ({
          conceptId: material.concept_id,
          conceptName: conceptNameMap[material.concept_id] || material.concept_name,
          artifacts: material.artifact_index
        }));
        return {
          job,
          items
        };
      })
      .filter(isPendingReviewGroup)
      .sort(
        (a, b) =>
          new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime()
      );
  }, [activeSubjectId, activeMaterials, jobMap, conceptNameMap]);

  const filteredSubjects = useMemo(() => {
    const query = subjectQuery.trim().toLowerCase();
    if (!query) {
      return subjects;
    }
    return subjects.filter((subject) => {
      const haystack = [
        subject.name,
        subject.grade_level,
        subject.description || ""
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [subjects, subjectQuery]);

  useEffect(() => {
    setPreviewOpen(false);
    setPreviewBlob(null);
    setPreviewError(null);
    setResourcesOpen(false);
    setResourcesMeta(null);
    setResources([]);
    setResourcesError(null);
    setVideoPreview(null);
    setApprovedVideoId(null);
    setSelectedConceptIds(new Set());
    setReviewDeleteOpen(false);
    setReviewDeleteMeta(null);
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
    if (!activeJobId) {
      return;
    }
    if (!activeJobStatus || !["queued", "running"].includes(activeJobStatus)) {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const updated = await getJobStatus(activeJobId);
        if (!cancelled) {
          setJobMap((prev) => ({ ...prev, [activeJobId]: updated }));
        }
      } catch {
        // ignore polling errors
      }
    };
    poll();
    const interval = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJobId, activeJobStatus]);

  const refreshSubjectData = useCallback(
    async (subjectId: string) => {
      const [materials, refreshed] = await Promise.all([
        listAdminSubjectMaterials(subjectId),
        getSubject(subjectId)
      ]);
      setMaterialsMap((prev) => ({ ...prev, [subjectId]: materials }));
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.subject_id === subjectId ? refreshed : subject
        )
      );
    },
    [getSubject, listAdminSubjectMaterials]
  );

  useEffect(() => {
    if (!activeJobId || !activeSubjectId) {
      jobStatusRef.current = null;
      return;
    }
    const currentStatus = activeJobStatus ?? null;
    const previousStatus = jobStatusRef.current;
    if (
      currentStatus &&
      previousStatus &&
      currentStatus !== previousStatus &&
      ["completed", "failed"].includes(currentStatus)
    ) {
      refreshSubjectData(activeSubjectId).catch(() => null);
    }
    jobStatusRef.current = currentStatus;
  }, [activeJobId, activeJobStatus, activeSubjectId, refreshSubjectData]);

  const handleOpenTopicPlanner = () => {
    setConceptDrafts(buildConceptPlannerDrafts(activeSubject));
    setShowConceptModal(true);
  };

  const handleCloseTopicPlanner = () => {
    setShowConceptModal(false);
    setConceptDrafts(buildConceptPlannerDrafts(activeSubject));
  };

  const handleCreateSubject = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await createSubject(subjectForm);
      setSubjects((prev) => [response, ...prev]);
      setActiveSubjectId(response.subject_id);
      setShowSubjectModal(false);
      setConceptDrafts([createTopicPlannerDraft()]);
      setSubjectForm({ name: "", grade_level: "", description: "" });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create syllabus.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConceptPlan = async () => {
    if (!activeSubjectId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const normalizedDrafts = conceptDrafts.filter(
        (draft) =>
          draft.is_existing ||
          draft.name.trim() ||
          draft.description.trim() ||
          Number(draft.pass_percentage) !== 70
      );
      if (
        normalizedDrafts.some(
          (draft) => !draft.name.trim()
        )
      ) {
        setError("Each topic card needs a topic name before saving the topic plan.");
        return;
      }
      const payload: AdminConceptPlanUpdateRequest = {
        concepts: normalizedDrafts
          .map((draft) => ({
            concept_id: draft.concept_id,
            name: draft.name.trim(),
            description: draft.description.trim() || undefined,
            pass_percentage: Number(draft.pass_percentage)
          }))
      };
      if (!payload.concepts.length) {
        setError("Add at least one topic.");
        return;
      }
      const invalidProgress = payload.concepts.some(
        (concept) =>
          !Number.isFinite(concept.pass_percentage) ||
          concept.pass_percentage < 1 ||
          concept.pass_percentage > 100
      );
      if (invalidProgress) {
        setError("Each topic needs a valid pass percentage.");
        return;
      }
      const response = await saveAdminConceptPlan(activeSubjectId, payload);
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.subject_id === activeSubjectId ? response : subject
        )
      );
      setShowConceptModal(false);
      setConceptDrafts(buildConceptPlannerDrafts(response));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save topic plan.");
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
      const conceptIds =
        selectedConceptIds.size > 0
          ? Array.from(selectedConceptIds)
          : ungeneratedConceptIds;
      if (!conceptIds.length) {
        setError("All topics already have study material. Select topics to regenerate.");
        return;
      }
      const payload: AdminMaterialJobCreate = {
        subject_id: activeSubjectId,
        concept_ids: conceptIds
      };
      const response = await createAdminJob(payload);
      setJobMap((prev) => ({ ...prev, [response.job_id]: response }));
      setSubjectJobs((prev) => ({ ...prev, [activeSubjectId]: response.job_id }));
      setSelectedConceptIds(new Set());
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to start generation.");
    } finally {
      setLoading(false);
    }
  };

  const approveJobConcepts = async (
    jobId: string,
    subjectId: string,
    conceptIds: string[]
  ) => {
    if (!conceptIds.length) {
      setError("Select at least one topic to approve.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await approveJob(jobId, {
        concept_ids: conceptIds
      });
      setJobMap((prev) => ({ ...prev, [jobId]: response }));
      await refreshSubjectData(subjectId);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Approval failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishSelected = async () => {
    if (!activeSubjectId) {
      return;
    }
    const conceptIds = Array.from(selectedConceptIds);
    if (!conceptIds.length) {
      setError("Select at least one topic to publish.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: AdminMaterialPublishRequest = { concept_ids: conceptIds };
      const response = await publishSelectedConcepts(activeSubjectId, payload);
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.subject_id === activeSubjectId ? response : subject
        )
      );
      const materials = await listAdminSubjectMaterials(activeSubjectId);
      setMaterialsMap((prev) => ({ ...prev, [activeSubjectId]: materials }));
      setSelectedConceptIds(new Set());
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Publish failed.");
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
      const materials = await listAdminSubjectMaterials(activeSubjectId);
      setMaterialsMap((prev) => ({ ...prev, [activeSubjectId]: materials }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Publish failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublishSubject = async () => {
    if (!activeSubjectId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await unpublishSubject(activeSubjectId);
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.subject_id === activeSubjectId ? response : subject
        )
      );
      const materials = await listAdminSubjectMaterials(activeSubjectId);
      setMaterialsMap((prev) => ({ ...prev, [activeSubjectId]: materials }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Unpublish failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadApprovedBundle = async () => {
    if (!activeSubjectId) {
      return;
    }
    setError(null);
    try {
      await downloadApprovedMaterialsBundle(activeSubjectId);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to download approved bundle.");
    }
  };

  const handleToggleConceptSelection = (conceptId: string) => {
    setSelectedConceptIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(conceptId)) {
        updated.delete(conceptId);
      } else {
        updated.add(conceptId);
      }
      return updated;
    });
  };

  const handleSelectAllConcepts = () => {
    if (!activeSubject?.concepts.length) {
      return;
    }
    if (selectedConceptIds.size) {
      setSelectedConceptIds(new Set());
      return;
    }
    setSelectedConceptIds(new Set(activeSubject.concepts.map((concept) => concept.concept_id)));
  };

  const getConceptStatusMeta = (status: ConceptMaterialResponse["lifecycle_status"] | SubjectResponse["concepts"][number]["material_status"]) => {
    switch (status) {
      case "published":
        return { label: "Published", tone: "success" };
      case "approved":
        return { label: "Ready to Publish", tone: "info" };
      case "draft":
        return { label: "Needs Approval", tone: "warning" };
      default:
        return { label: "Not Generated", tone: "neutral" };
    }
  };

  const handleOpenLearningPage = (conceptId: string) => {
    if (!activeSubjectId) {
      return;
    }
    const url = `${window.location.origin}/learn/${activeSubjectId}/${conceptId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const toSafeFilename = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return slug || "material";
  };

  const formatJobDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown time";
    }
    return date.toLocaleString();
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
      title: `${options.conceptName} - ${options.fileType.toUpperCase()}`,
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

  const handleOpenDelete = () => {
    if (!activeSubject) {
      return;
    }
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!activeSubject) {
      return;
    }
    setDeleteLoading(true);
    setError(null);
    try {
      await deleteSubject(activeSubject.subject_id, hasRunningJobs);
      setSubjects((prev) => {
        const updated = prev.filter((subject) => subject.subject_id !== activeSubject.subject_id);
        setActiveSubjectId((current) => {
          if (current !== activeSubject.subject_id) {
            return current;
          }
          return updated.length ? updated[0].subject_id : null;
        });
        return updated;
      });
      setMaterialsMap((prev) => {
        const updated = { ...prev };
        delete updated[activeSubject.subject_id];
        return updated;
      });
      setJobMap((prev) => {
        const updated = { ...prev };
        const jobId = subjectJobs[activeSubject.subject_id];
        if (jobId) {
          delete updated[jobId];
        }
        return updated;
      });
      setSubjectJobs((prev) => {
        const updated = { ...prev };
        delete updated[activeSubject.subject_id];
        return updated;
      });
      setDeleteOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to delete syllabus.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const toYouTubeEmbed = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        const id = parsed.pathname.replace("/", "");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.hostname.includes("youtube.com")) {
        if (parsed.pathname.startsWith("/embed/")) {
          const id = parsed.pathname.replace("/embed/", "");
          return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        if (parsed.pathname.startsWith("/shorts/")) {
          const id = parsed.pathname.replace("/shorts/", "");
          return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const handleOpenResources = async (concept: { concept_id: string; name: string }) => {
    if (!activeSubjectId) {
      return;
    }
    setResourcesOpen(true);
    setResourcesMeta({ conceptId: concept.concept_id, conceptName: concept.name });
    setResourcesLoading(true);
    setResourcesError(null);
    try {
      const response: ConceptResourcesResponse = await getAdminConceptResources(
        activeSubjectId,
        concept.concept_id
      );
      setResources(response.resources || []);
      setApprovedVideoId(response.approved_video_id ?? null);
    } catch (err: any) {
      setResourcesError(err?.response?.data?.detail || "Failed to load resources.");
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleCloseResources = () => {
    setResourcesOpen(false);
    setResourcesMeta(null);
    setResources([]);
    setResourcesError(null);
    setVideoPreview(null);
    setApprovedVideoId(null);
  };

  const handleOpenReviewDelete = (jobId: string, conceptId: string, conceptName: string) => {
    setReviewDeleteMeta({ jobId, conceptId, conceptName });
    setReviewDeleteOpen(true);
  };

  const handleCloseReviewDelete = () => {
    setReviewDeleteOpen(false);
    setReviewDeleteMeta(null);
  };

  const handleOpenVideo = (resource: ResourceItem) => {
    const embedUrl = toYouTubeEmbed(resource.url);
    if (!embedUrl) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
      return;
    }
    setVideoPreview({ title: resource.title, embedUrl });
  };

  const handleConfirmReviewDelete = async () => {
    if (!reviewDeleteMeta) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await discardJobConcept(
        reviewDeleteMeta.jobId,
        reviewDeleteMeta.conceptId
      );
      setJobMap((prev) => ({ ...prev, [response.job_id]: response }));
      handleCloseReviewDelete();
      await refreshSubjectData(response.subject_id);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to delete generated material.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseVideo = () => {
    setVideoPreview(null);
  };

  const handleRefreshVideo = async (resource: ResourceItem) => {
    if (!activeSubjectId || !resourcesMeta) {
      return;
    }
    setVideoActionLoading(true);
    setResourcesError(null);
    try {
      const response = await refreshAdminConceptVideo(
        activeSubjectId,
        resourcesMeta.conceptId,
        resource.url
      );
      setResources(response.resources || []);
      setApprovedVideoId(response.approved_video_id ?? null);
    } catch (err: any) {
      setResourcesError(err?.response?.data?.detail || "Failed to refresh video.");
    } finally {
      setVideoActionLoading(false);
    }
  };

  const handleApproveVideo = async (resource: ResourceItem) => {
    if (!activeSubjectId || !resourcesMeta) {
      return;
    }
    setVideoActionLoading(true);
    setResourcesError(null);
    try {
      const response = await approveAdminConceptVideo(
        activeSubjectId,
        resourcesMeta.conceptId,
        resource.url
      );
      setApprovedVideoId(response.approved_video_id ?? null);
    } catch (err: any) {
      setResourcesError(err?.response?.data?.detail || "Failed to approve video.");
    } finally {
      setVideoActionLoading(false);
    }
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
      return (
        <div className="inline-actions">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              handleOpenResources({
                concept_id: options.conceptId,
                name: options.conceptName
              })
            }
          >
            Review Resources
          </Button>
          {activeSubjectId ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleOpenLearningPage(options.conceptId)}
            >
              Open Learning Page
            </Button>
          ) : null}
          <span className="muted">No previewable files yet.</span>
        </div>
      );
    }


    return (
      <div className="inline-actions">
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            handleOpenResources({
              concept_id: options.conceptId,
              name: options.conceptName
            })
          }
        >
          Review Resources
        </Button>
        {activeSubjectId ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenLearningPage(options.conceptId)}
          >
            Open Learning Page
          </Button>
        ) : null}
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

    if (!filteredSubjects.length) {
      return (
        <EmptyState
          title="No matching syllabus"
          description="Try a different keyword to find your syllabus."
        />
      );
    }

    return filteredSubjects.map((subject) => {
      const isActive = activeSubjectId === subject.subject_id;
      const topicCount = subject.concepts.length;
      return (
        <button
          key={subject.subject_id}
          className={`subject-card ${isActive ? "active" : ""}`}
          onClick={() => setActiveSubjectId(subject.subject_id)}
        >
          <div className="subject-card-header">
            <div>
              <p className="subject-card-title">{subject.name}</p>
              <p className="subject-card-subtitle">Grade {subject.grade_level}</p>
            </div>
            <Badge variant={subject.published ? "success" : "warning"}>
              {subject.published ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className={`subject-card-description ${subject.description ? "" : "muted"}`}>
            {subject.description || "No description provided yet."}
          </p>
          <div className="subject-card-footer">
            <span className="subject-card-meta">{topicCount} Topics</span>
          </div>
        </button>
      );
    });
  };

  return (
    <DashboardLayout
      title="Study Material Control"
      subtitle="Create syllabi, generate materials, and publish to students."
      showHeader={false}
    >
      <PageHeader
        title="Syllabus Workspace"
        subtitle="Manage each syllabus end-to-end with AI-powered generation."
      />
      {error ? <div className="alert danger">{error}</div> : null}

      <Card className="panel admin-subjects-panel">
        <div className="panel-header">
          <h3>All Syllabi</h3>
          <Button variant="ghost" onClick={() => setShowSubjectModal(true)}>
            New
          </Button>
        </div>
        <div className="subject-toolbar">
          <Input
            label="Search Syllabus"
            value={subjectQuery}
            onChange={(event) => setSubjectQuery(event.target.value)}
            placeholder="Search by name, grade, or description"
          />
        </div>
        <div className="subject-grid">{renderSubjectList()}</div>
      </Card>

      <div className="admin-workspace">
        {!activeSubject ? (
          <Card className="panel">
            <EmptyState
              title="Select a syllabus"
              description="Choose a syllabus above to view details and generate materials."
            />
          </Card>
        ) : (
          <Card className="panel">
            <div className="panel-header">
              <div>
                <h3>{activeSubject.name}</h3>
                <p className="muted">Grade {activeSubject.grade_level}</p>
              </div>
              <div className="inline-actions">
                <Badge variant={activeSubject.published ? "success" : "warning"}>
                  {activeSubject.published ? "Published" : "Draft"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleOpenDelete}>
                  Delete
                </Button>
              </div>
            </div>
            {activeSubject.description ? <p>{activeSubject.description}</p> : null}
            <div className="section">
              <div className="section-header">
                <h3>Topics</h3>
                <div className="inline-actions section-header-actions">
                  <Button variant="ghost" size="sm" onClick={handleSelectAllConcepts}>
                    {selectedConceptIds.size ? "Unselect All" : "Select All"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleOpenTopicPlanner}
                  >
                    {activeSubject.concepts.length ? "Manage Topics" : "Add Topics"}
                  </Button>
                </div>
              </div>
              {activeSubject.published ? (
                <p className="muted">
                  Published topics stay locked. Use Manage Topics to append new topics without
                  disturbing the live sequence.
                </p>
              ) : null}
              {hasRunningJobs ? (
                <p className="muted">
                  A material generation job is running. You can review the topic plan, but save it
                  after the run completes.
                </p>
              ) : null}
              {activeSubject.concepts.length ? (
                <div className="topic-list">
                  {activeSubject.concepts.map((concept) => (
                    <div
                      key={concept.concept_id}
                      className={`topic-item ${
                        selectedConceptIds.has(concept.concept_id) ? "selected" : ""
                      }`}
                    >
                      {(() => {
                        const statusMeta = getConceptStatusMeta(resolveConceptStatus(concept));
                        return (
                          <span className={`topic-ribbon ${statusMeta.tone}`}>
                            {statusMeta.label}
                          </span>
                        );
                      })()}
                      <label className="topic-select">
                        <input
                          type="checkbox"
                          checked={selectedConceptIds.has(concept.concept_id)}
                          onChange={() => handleToggleConceptSelection(concept.concept_id)}
                          aria-label={`Select ${concept.name}`}
                        />
                        <span aria-hidden="true" />
                      </label>
                      <div className="topic-content">
                        <p className="topic-name">
                          Topic {concept.topic_order}: {concept.name}
                        </p>
                        <p className="topic-desc">
                          {concept.description || "No topic description provided."}
                          {` • Pass ${concept.pass_percentage}%`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No topics yet"
                  description="Add at least one topic before generating study materials."
                />
              )}
              {pendingReviewGroups.length ? (
                <div className="review-section">
                  <div className="section-header">
                    <div>
                      <h4>Pending Review</h4>
                      <p className="muted">
                        Review regenerated topics and approve only what should replace the
                        current version.
                      </p>
                    </div>
                  </div>
                  <div className="review-group-list">
                    {pendingReviewGroups.map((group) => {
                      return (
                        <div key={group.job.job_id} className="review-group">
                          <div className="section-header">
                            <div>
                              <h4>Generation Run • {formatJobDate(group.job.created_at)}</h4>
                              <p className="muted">
                                {group.items.length} topics awaiting approval
                              </p>
                            </div>
                          </div>
                          <div className="material-list review-list">
                            {group.items.map((item) => (
                              <div
                                key={item.conceptId}
                                className="material-card review-card"
                              >
                                <div>
                                  <h4>{item.conceptName}</h4>
                                  <p className="muted">New material ready for approval</p>
                                </div>
                                <div className="review-actions">
                                  {renderArtifactActions({
                                    conceptId: item.conceptId,
                                    conceptName: item.conceptName,
                                    jobId: group.job.job_id,
                                    artifactIndex: item.artifacts
                                  })}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setImageReviewMeta({
                                        conceptId: item.conceptId,
                                        conceptName: item.conceptName
                                      })
                                    }
                                  >
                                    Generate Learning Thumbnail
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="review-approve"
                                    onClick={() =>
                                      approveJobConcepts(
                                        group.job.job_id,
                                        group.job.subject_id,
                                        [item.conceptId]
                                      )
                                    }
                                    disabled={loading}
                                  >
                                    Approve This Topic
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() =>
                                      handleOpenReviewDelete(
                                        group.job.job_id,
                                        item.conceptId,
                                        item.conceptName
                                      )
                                    }
                                  >
                                    Delete Draft
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="section">
              <div className="section-header">
                <h4>Generation</h4>
              </div>
              <div className="inline-actions">
                {selectedConceptIds.size || !allGenerated ? (
                  <Button
                    onClick={handleGenerateMaterial}
                    disabled={!activeSubject.concepts.length || loading}
                  >
                    {selectedConceptIds.size
                      ? `Generate Selected (${selectedConceptIds.size})`
                      : "Generate Remaining Topics"}
                  </Button>
                ) : null}
              </div>
              {activeJob ? (
                <JobProgress
                  job={activeJob}
                  subjectName={activeSubject?.name}
                  conceptNameMap={conceptNameMap}
                />
              ) : null}
              {selectedConceptIds.size ? (
                <>
                  <div className="inline-actions">
                    <Button
                      variant="ghost"
                      onClick={handlePublishSelected}
                      disabled={!canPublishSelected || loading}
                    >
                      Publish Selected ({selectedConceptIds.size})
                    </Button>
                  </div>
                  {!canPublishSelected ? (
                    <p className="muted">
                      Only topics marked Ready to Publish can be published.
                    </p>
                  ) : null}
                </>
              ) : null}
              {!activeSubject.published && !selectedConceptIds.size ? (
                <div className="inline-actions">
                  <Button
                    variant="ghost"
                    onClick={handlePublishSubject}
                    disabled={!canPublishAll || loading}
                  >
                    Publish All Topics
                  </Button>
                </div>
              ) : null}
              {activeSubject.published ? (
                <div className="inline-actions">
                  <Button variant="ghost" onClick={handleUnpublishSubject} disabled={loading}>
                    Unpublish
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        )}

        <Card className="panel">
          <div className="panel-header">
            <h3>Approved Materials</h3>
            {approvedMaterials.length ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadApprovedBundle}
                disabled={loading}
              >
                Download Approved Bundle
              </Button>
            ) : null}
          </div>
          {approvedMaterials.length ? (
            <div className="material-list">
              {approvedMaterials.map((material) => (
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
          ) : (
            <EmptyState
              title="No approved materials yet"
              description="Approve generated topics to publish them here."
            />
          )}
        </Card>
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
        title="Manage Topic Plan"
        onClose={handleCloseTopicPlanner}
        className="topic-planner-modal"
        bodyClassName="topic-planner-modal-body"
        footer={
          <div className="inline-actions">
            <Button variant="ghost" onClick={handleCloseTopicPlanner}>
              Cancel
            </Button>
            <Button onClick={handleSaveConceptPlan} disabled={loading || hasRunningJobs}>
              {loading ? "Saving..." : "Save Topic Plan"}
            </Button>
          </div>
        }
      >
        <AdminTopicPlanner
          items={conceptDrafts}
          disabled={loading || hasRunningJobs}
          publishedMode={Boolean(activeSubject?.published)}
          onChange={setConceptDrafts}
          onAddTopic={() =>
            setConceptDrafts((prev) => [...prev, createTopicPlannerDraft()])
          }
          onRemoveTopic={(clientId) =>
            setConceptDrafts((prev) => {
              const next = prev.filter((item) => item.client_id !== clientId);
              return next.length ? next : [createTopicPlannerDraft()];
            })
          }
        />
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

      <Modal
        open={deleteOpen}
        title="Delete Syllabus"
        onClose={() => setDeleteOpen(false)}
        footer={
          <div className="inline-actions">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      >
        {hasRunningJobs ? (
          <div className="alert danger">
            A generation job is running for this syllabus. Deleting will stop the job and remove
            all related data.
          </div>
        ) : null}
        <p>
          This will permanently delete the syllabus, all topics, generated materials, jobs, and
          resources. This action cannot be undone.
        </p>
      </Modal>

      <Modal
        open={reviewDeleteOpen}
        title="Delete Generated Draft"
        onClose={handleCloseReviewDelete}
        footer={
          <div className="inline-actions">
            <Button variant="ghost" onClick={handleCloseReviewDelete}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmReviewDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete Draft"}
            </Button>
          </div>
        }
      >
        <p>
          This will remove the generated draft for{" "}
          <strong>{reviewDeleteMeta?.conceptName}</strong> from this review queue and delete its
          draft files. Approved materials will remain unchanged.
        </p>
      </Modal>

      <Modal
        open={resourcesOpen}
        title={
          resourcesMeta
            ? `Resources - ${resourcesMeta.conceptName}`
            : "Resources"
        }
        onClose={handleCloseResources}
        className="viewer-modal"
        bodyClassName="viewer-body"
      >
        {resourcesLoading ? (
          <div className="flashcard-loading">
            <LoadingSpinner />
          </div>
        ) : resourcesError ? (
          <div className="alert danger">{resourcesError}</div>
        ) : resources.length ? (
          <div className="resource-list">
            {resources.map((resource, index) => {
              const isYoutube = Boolean(toYouTubeEmbed(resource.url));
              const videoId = (() => {
                try {
                  const parsed = new URL(resource.url);
                  if (parsed.hostname.includes("youtu.be")) {
                    return parsed.pathname.replace("/", "");
                  }
                  if (parsed.pathname.startsWith("/embed/")) {
                    return parsed.pathname.replace("/embed/", "");
                  }
                  if (parsed.pathname.startsWith("/shorts/")) {
                    return parsed.pathname.replace("/shorts/", "");
                  }
                  return parsed.searchParams.get("v") || "";
                } catch {
                  return "";
                }
              })();
              return (
                <div key={`${resource.url}-${index}`} className="resource-card">
                  <div>
                    <p className="resource-title">{resource.title}</p>
                    {resource.note ? <p className="muted">{resource.note}</p> : null}
                    {approvedVideoId && videoId && approvedVideoId === videoId ? (
                      <span className="badge success">Approved</span>
                    ) : null}
                  </div>
                  <div className="inline-actions">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenVideo(resource)}>
                      {isYoutube ? "Watch Video" : "Open Link"}
                    </Button>
                    {isYoutube ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleApproveVideo(resource)}
                          disabled={videoActionLoading}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRefreshVideo(resource)}
                          disabled={videoActionLoading}
                        >
                          Replace Video
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No resources yet"
            description="Resources will appear once generation is completed."
          />
        )}
      </Modal>

      <Modal
        open={Boolean(videoPreview)}
        title={videoPreview?.title ?? "Video"}
        onClose={handleCloseVideo}
        className="viewer-modal"
        bodyClassName="viewer-body"
      >
        {videoPreview ? (
          <div className="material-viewer">
            <iframe
              className="material-frame"
              src={videoPreview.embedUrl}
              title={videoPreview.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null}
      </Modal>

      {activeSubjectId && imageReviewMeta ? (
        <ConceptImageReviewModal
          open={Boolean(imageReviewMeta)}
          subjectId={activeSubjectId}
          conceptId={imageReviewMeta.conceptId}
          conceptName={imageReviewMeta.conceptName}
          onClose={() => setImageReviewMeta(null)}
        />
      ) : null}

      {loading ? (
        <div className="loading-overlay">
          <LoadingSpinner />
        </div>
      ) : null}
    </DashboardLayout>
  );
};
