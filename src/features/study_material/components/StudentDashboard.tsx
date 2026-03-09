import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import {
  MaterialPreviewModal,
  type PreviewFileType
} from "@/features/study_material/components/MaterialPreviewModal";
import {
  downloadStudentSubjectArtifact,
  enrollInSubject,
  fetchStudentConceptArtifact,
  fetchStudentSubjectArtifact,
  getStudentFlashcards,
  getStudentResources,
  listPublishedConcepts,
  listStudentBookmarks,
  addStudentBookmark,
  removeStudentBookmark,
  listPublishedMaterials,
  listPublishedSubjects
} from "@/features/study_material/services/studyMaterialService";
import { startQuizSession } from "@/features/quiz/services/quizService";
import type {
  ConceptMaterialResponse,
  ConceptBookmarkResponse,
  ConceptResponse,
  FlashcardItem,
  ResourceItem,
  SubjectResponse
} from "@/features/study_material/types";

export const StudentDashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<ConceptResponse[]>([]);
  const [materials, setMaterials] = useState<ConceptMaterialResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<ConceptBookmarkResponse[]>([]);
  const navigate = useNavigate();


  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [flashcardMeta, setFlashcardMeta] = useState<{
    conceptId: string;
    conceptName: string;
  } | null>(null);
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [flashcardError, setFlashcardError] = useState<string | null>(null);

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

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<{
    title: string;
    fileName: string;
    fileType: PreviewFileType;
  } | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [quizStarting, setQuizStarting] = useState(false);
  const [enrollingSubjectId, setEnrollingSubjectId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoading(true);
      try {
        const response = await listPublishedSubjects();
        setSubjects(response);
        if (response.length) {
          setActiveSubjectId(response[0].subject_id);
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load published subjects.");
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
    const selectedSubject = subjects.find((subject) => subject.subject_id === activeSubjectId);
    if (!selectedSubject?.is_enrolled) {
      setConcepts([]);
      setMaterials([]);
      setLoading(false);
      return;
    }
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [conceptsResponse, materialsResponse] = await Promise.all([
          listPublishedConcepts(activeSubjectId),
          listPublishedMaterials(activeSubjectId)
        ]);
        setConcepts(conceptsResponse);
        setMaterials(materialsResponse);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load materials.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [activeSubjectId, subjects]);

  useEffect(() => {
    if (!activeSubjectId) {
      return;
    }
    const selectedSubject = subjects.find((subject) => subject.subject_id === activeSubjectId);
    if (!selectedSubject?.is_enrolled) {
      setBookmarks([]);
      return;
    }
    listStudentBookmarks(activeSubjectId)
      .then((items) => setBookmarks(items))
      .catch(() => setBookmarks([]));
  }, [activeSubjectId, subjects]);

  useEffect(() => {
    setFlashcardMeta(null);
    setFlashcards([]);
    setFlashcardIndex(0);
    setFlashcardFlipped(false);
    setFlashcardError(null);
    setResourcesOpen(false);
    setResourcesMeta(null);
    setResources([]);
    setResourcesError(null);
    setVideoPreview(null);
    setPreviewOpen(false);
    setPreviewBlob(null);
    setPreviewError(null);
    setSearchQuery("");
    setBookmarks([]);
    setSelectedConceptIds([]);
  }, [activeSubjectId]);

  const activeSubject = subjects.find((subject) => subject.subject_id === activeSubjectId);
  const canAccessActiveSubject = Boolean(activeSubject?.is_enrolled);
  const materialMap = useMemo(() => {
    const map = new Map<string, ConceptMaterialResponse>();
    materials.forEach((material) => map.set(material.concept_id, material));
    return map;
  }, [materials]);

  const bookmarkedIds = useMemo(
    () => new Set(bookmarks.map((bookmark) => bookmark.concept_id)),
    [bookmarks]
  );

  const filteredConcepts = useMemo(() => {
    if (!searchQuery.trim()) {
      return concepts;
    }
    const term = searchQuery.toLowerCase();
    return concepts.filter((concept) =>
      concept.name.toLowerCase().includes(term) ||
      (concept.description || "").toLowerCase().includes(term)
    );
  }, [concepts, searchQuery]);

  const activeFlashcard = flashcards[flashcardIndex];

  const isBookmarked = (conceptId: string) => bookmarkedIds.has(conceptId);

  const handleToggleBookmark = async (concept: ConceptResponse) => {
    if (!activeSubjectId) {
      return;
    }
    const marked = bookmarkedIds.has(concept.concept_id);
    try {
      if (marked) {
        await removeStudentBookmark(activeSubjectId, concept.concept_id);
        setBookmarks((prev) =>
          prev.filter((item) => item.concept_id !== concept.concept_id)
        );
      } else {
        await addStudentBookmark(activeSubjectId, concept.concept_id);
        setBookmarks((prev) => [
          ...prev,
          {
            concept_id: concept.concept_id,
            concept_name: concept.name,
            subject_id: activeSubjectId,
            subject_name: activeSubject?.name || "Subject",
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Bookmark update failed.");
    }
  };

  const handleOpenFlashcards = async (concept: ConceptResponse) => {
    if (!activeSubjectId) {
      return;
    }
    setFlashcardLoading(true);
    setFlashcardError(null);
    try {
      const cards = await getStudentFlashcards(activeSubjectId, concept.concept_id);
      setFlashcards(cards);
      setFlashcardIndex(0);
      setFlashcardFlipped(false);
      setFlashcardMeta({ conceptId: concept.concept_id, conceptName: concept.name });
    } catch (err: any) {
      setFlashcardError(err?.response?.data?.detail || "Failed to load flashcards.");
      setFlashcards([]);
    } finally {
      setFlashcardLoading(false);
    }
  };

  const handleCloseFlashcards = () => {
    setFlashcardMeta(null);
    setFlashcards([]);
    setFlashcardIndex(0);
    setFlashcardFlipped(false);
    setFlashcardError(null);
  };

  const toYouTubeEmbed = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        const id = parsed.pathname.replace("/", "");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.hostname.includes("youtube.com")) {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const handleOpenResources = async (concept: ConceptResponse) => {
    if (!activeSubjectId) {
      return;
    }
    setResourcesOpen(true);
    setResourcesMeta({ conceptId: concept.concept_id, conceptName: concept.name });
    setResourcesLoading(true);
    setResourcesError(null);
    setResources([]);
    try {
      const items = await getStudentResources(activeSubjectId, concept.concept_id);
      setResources(items);
    } catch (err: any) {
      setResourcesError(err?.response?.data?.detail || "Failed to load resources.");
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleCloseResources = () => {
    setResourcesOpen(false);
    setResourcesMeta(null);
    setResources([]);
    setResourcesError(null);
  };

  const handleOpenVideo = (resource: ResourceItem) => {
    const embedUrl = toYouTubeEmbed(resource.url);
    if (!embedUrl) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
      return;
    }
    setVideoPreview({ title: resource.title, embedUrl });
  };

  const handleCloseVideo = () => {
    setVideoPreview(null);
  };

  const toSafeFilename = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return slug || "material";
  };

  const toSafeLabel = (value: string) => {
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

  const handlePreviewSubjectArtifact = async (artifactName: string, label: string) => {
    if (!activeSubjectId || !activeSubject) {
      return;
    }
    const fileName = `${toSafeFilename(activeSubject.name)}-${toSafeLabel(label)}.pdf`;
    await openPreview({
      title: `${activeSubject.name} - ${label}`,
      fileName,
      fileType: "pdf",
      fetcher: () => fetchStudentSubjectArtifact(activeSubjectId, artifactName)
    });
  };

  const handlePreviewConceptArtifact = async (
    concept: ConceptResponse,
    artifactName: string,
    label: string
  ) => {
    if (!activeSubjectId) {
      return;
    }
    const fileName = `${toSafeFilename(concept.name)}-${toSafeLabel(label)}.pdf`;
    await openPreview({
      title: `${concept.name} - ${label}`,
      fileName,
      fileType: "pdf",
      fetcher: () =>
        fetchStudentConceptArtifact(activeSubjectId, concept.concept_id, artifactName)
    });
  };

  const toggleConceptSelection = (conceptId: string) => {
    setSelectedConceptIds((prev) => {
      if (prev.includes(conceptId)) {
        return prev.filter((id) => id !== conceptId);
      }
      return [...prev, conceptId];
    });
  };

  const handleStartQuiz = async () => {
    if (!activeSubjectId || selectedConceptIds.length === 0) {
      return;
    }
    setQuizStarting(true);
    setError(null);
    try {
      const response = await startQuizSession({
        subject_id: activeSubjectId,
        concept_ids: selectedConceptIds
      });
      navigate(`/student/quiz/${response.session.session_id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to start quiz session.");
    } finally {
      setQuizStarting(false);
    }
  };

  const handleEnrollSubject = async () => {
    if (!activeSubject) {
      return;
    }
    setEnrollingSubjectId(activeSubject.subject_id);
    setError(null);
    try {
      const enrollment = await enrollInSubject(activeSubject.subject_id);
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.subject_id === activeSubject.subject_id
            ? {
                ...subject,
                is_enrolled: true,
                enrolled_at: enrollment.enrolled_at
              }
            : subject
        )
      );
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to enroll in this syllabus.");
    } finally {
      setEnrollingSubjectId(null);
    }
  };

  return (
    <DashboardLayout title="Student Library" subtitle="Explore published study materials.">
      <PageHeader
        title="Your Study Library"
        subtitle="Browse published syllabi, preview materials, open flashcards, and download when needed."
      />
      {error ? <div className="alert danger">{error}</div> : null}

      <div className="grid two-col">
        <Card className="panel">
          <div className="panel-header">
            <h3>Published Syllabi</h3>
          </div>
          {subjects.length ? (
            <div className="list-stack">
              {subjects.map((subject) => (
                <button
                  key={subject.subject_id}
                  className={`list-item ${activeSubjectId === subject.subject_id ? "active" : ""}`}
                  onClick={() => setActiveSubjectId(subject.subject_id)}
                >
                  <div className="subject-list-row">
                    <div>
                      <p className="list-title">{subject.name}</p>
                      <span className="list-subtitle">Grade {subject.grade_level}</span>
                    </div>
                    <Badge variant={subject.is_enrolled ? "success" : "info"}>
                      {subject.is_enrolled ? "Enrolled" : "Preview"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No published syllabus yet"
              description="Ask your instructor to publish study materials."
            />
          )}
        </Card>

        <div className="stack">
          {!activeSubject ? (
            <Card className="panel">
              <EmptyState title="Select a syllabus" description="Pick a syllabus to view materials." />
            </Card>
          ) : (
            <Card className="panel">
              <div className="panel-header">
                <div>
                  <h3>{activeSubject.name}</h3>
                  <p className="muted">
                    Grade {activeSubject.grade_level}
                    {activeSubject.enrolled_at
                      ? ` • Enrolled ${new Date(activeSubject.enrolled_at).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <Badge variant={canAccessActiveSubject ? "success" : "info"}>
                  {canAccessActiveSubject ? "Enrolled" : "Preview Only"}
                </Badge>
              </div>
              {activeSubject.description ? <p>{activeSubject.description}</p> : null}
              {!canAccessActiveSubject ? (
                <div className="enrollment-preview-card">
                  <div className="enrollment-preview-header">
                    <div>
                      <p className="eyebrow">Student Access Control</p>
                      <h4>Enroll to unlock the full syllabus</h4>
                      <p className="muted">
                        Detailed topics, learning pages, flashcards, resources, and tests stay
                        hidden until you enroll in this course.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleEnrollSubject}
                      disabled={enrollingSubjectId === activeSubject.subject_id}
                    >
                      {enrollingSubjectId === activeSubject.subject_id ? "Enrolling..." : "Enroll"}
                    </Button>
                  </div>
                  <div className="enrollment-preview-grid">
                    <div className="enrollment-preview-item">
                      <span>Access unlocks</span>
                      <strong>Topics, quizzes, PDFs, flashcards</strong>
                    </div>
                    <div className="enrollment-preview-item">
                      <span>Current view</span>
                      <strong>Syllabus title and description only</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="section">
                    <div className="section-header">
                      <h4>Subject Pack</h4>
                    </div>
                    <div className="inline-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePreviewSubjectArtifact("pdf", "Study Material")}
                      >
                        View Study PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handlePreviewSubjectArtifact("quick_revision_pdf", "Quick Revision")
                        }
                      >
                        Quick Revision
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadStudentSubjectArtifact(activeSubjectId!, "zip")}
                      >
                        Full Bundle
                      </Button>
                    </div>
                    <p className="muted">A combined version of all topics in one file set.</p>
                  </div>
                  <div className="section">
                    <div className="section-header">
                      <h4>Start a Custom Quiz</h4>
                      <Badge variant="info">New</Badge>
                    </div>
                    <p className="muted">
                      Select the topics you want to be tested on. Your quiz is generated uniquely
                      when you click Start Test.
                    </p>
                    {filteredConcepts.length ? (
                      <div className="topic-list">
                        {filteredConcepts.map((concept) => {
                          const isSelected = selectedConceptIds.includes(concept.concept_id);
                          return (
                            <div
                              key={`quiz-${concept.concept_id}`}
                              className={`topic-item ${isSelected ? "selected" : ""}`}
                            >
                              <span className="topic-ribbon info">Published</span>
                              <label className="topic-select">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleConceptSelection(concept.concept_id)}
                                />
                                <span />
                              </label>
                              <div className="topic-content">
                                <p className="topic-name">{concept.name}</p>
                                <p className="topic-desc">
                                  {concept.description || "Concept overview"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState title="No topics" description="No published topics found." />
                    )}
                    <div className="inline-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!selectedConceptIds.length || quizStarting}
                        onClick={handleStartQuiz}
                      >
                        {quizStarting ? "Starting..." : "Start Test"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!selectedConceptIds.length}
                        onClick={() => setSelectedConceptIds([])}
                      >
                        Clear Selection
                      </Button>
                      <span className="muted">
                        {selectedConceptIds.length} topic(s) selected
                      </span>
                    </div>
                  </div>
                  <div className="section">
                    <div className="section-header">
                      <h4>Topics & Materials</h4>
                    </div>
                    <Input
                      label="Search topics"
                      placeholder="Search by topic name or description"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                    {filteredConcepts.length ? (
                      <div className="topic-grid">
                        {filteredConcepts.map((concept) => {
                          const material = materialMap.get(concept.concept_id);
                          return (
                            <Card key={concept.concept_id} className="topic-card">
                              <div className="topic-header">
                                <div>
                                  <h4>{concept.name}</h4>
                                  <p className="muted">
                                    {concept.description || "Concept overview"}
                                  </p>
                                </div>
                                <Badge variant={material ? "success" : "warning"}>
                                  {material ? "Ready" : "Pending"}
                                </Badge>
                              </div>
                              <div className="topic-actions">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleOpenFlashcards(concept)}
                                >
                                  Flashcards
                                </Button>
                                {material ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        navigate(`/learn/${activeSubjectId!}/${concept.concept_id}`)
                                      }
                                    >
                                      Open Learning Page
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={
                                        isBookmarked(concept.concept_id) ? "secondary" : "ghost"
                                      }
                                      onClick={() => handleToggleBookmark(concept)}
                                    >
                                      {isBookmarked(concept.concept_id) ? "Bookmarked" : "Bookmark"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handlePreviewConceptArtifact(
                                          concept,
                                          "pdf",
                                          "Study Material"
                                        )
                                      }
                                    >
                                      View Study PDF
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handlePreviewConceptArtifact(
                                          concept,
                                          "quick_revision_pdf",
                                          "Quick Revision"
                                        )
                                      }
                                    >
                                      Quick Revision
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenResources(concept)}
                                    >
                                      Resources
                                    </Button>
                                  </>
                                ) : (
                                  <span className="muted">Materials not published yet.</span>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState title="No topics" description="No published topics found." />
                    )}
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <LoadingSpinner />
        </div>
      ) : null}

      <Modal
        open={Boolean(flashcardMeta)}
        title={flashcardMeta ? `Flashcards: ${flashcardMeta.conceptName}` : "Flashcards"}
        onClose={handleCloseFlashcards}
        footer={
          flashcards.length ? (
            <div className="flashcard-controls">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setFlashcardIndex((prev) => {
                    const nextIndex = prev === 0 ? flashcards.length - 1 : prev - 1;
                    setFlashcardFlipped(false);
                    return nextIndex;
                  })
                }
              >
                Previous
              </Button>
                                <Button
                size="sm"
                variant="secondary"
                onClick={() => setFlashcardFlipped((prev) => !prev)}
              >
                {flashcardFlipped ? "Show Question" : "Show Answer"}
              </Button>
                                <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setFlashcardIndex((prev) => {
                    const nextIndex = (prev + 1) % flashcards.length;
                    setFlashcardFlipped(false);
                    return nextIndex;
                  })
                }
              >
                Next
              </Button>
            </div>
          ) : null
        }
      >
        {flashcardLoading ? (
          <div className="flashcard-loading">
            <LoadingSpinner />
          </div>
        ) : flashcardError ? (
          <div className="alert danger">{flashcardError}</div>
        ) : flashcards.length ? (
          <div className="flashcard-stage">
            <div className="flashcard-count">
              Card {flashcardIndex + 1} of {flashcards.length}
            </div>
            <button
              className={`flashcard ${flashcardFlipped ? "flipped" : ""}`}
              onClick={() => setFlashcardFlipped((prev) => !prev)}
            >
              <div className="flashcard-face front">
                <p>{activeFlashcard?.question}</p>
                <span className="flashcard-hint">Tap to reveal answer</span>
              </div>
              <div className="flashcard-face back">
                <p>{activeFlashcard?.answer}</p>
                <span className="flashcard-hint">Tap to return to question</span>
              </div>
            </button>
          </div>
        ) : (
          <EmptyState
            title="No flashcards yet"
            description="Flashcards will appear once the syllabus is fully published."
          />
        )}
      </Modal>

      <Modal
        open={resourcesOpen}
        title={resourcesMeta ? `Resources: ${resourcesMeta.conceptName}` : "Resources"}
        onClose={handleCloseResources}
      >
        {resourcesLoading ? (
          <div className="flashcard-loading">
            <LoadingSpinner />
          </div>
        ) : resourcesError ? (
          <div className="alert danger">{resourcesError}</div>
        ) : resources.length ? (
          <div className="resource-list">
            {resources.map((resource, index) => (
              <div key={`${resource.url}-${index}`} className="resource-card">
                <div>
                  <p className="resource-title">{resource.title}</p>
                  {resource.note ? <p className="muted">{resource.note}</p> : null}
                </div>
                <div className="inline-actions">
                  <Button size="sm" variant="ghost" onClick={() => handleOpenVideo(resource)}>
                    {toYouTubeEmbed(resource.url) ? "Watch Video" : "Open Link"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No resources yet"
            description="Resource links will appear once they are curated."
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
    </DashboardLayout>
  );
};










