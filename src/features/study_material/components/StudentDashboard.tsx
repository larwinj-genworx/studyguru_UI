import React, { useEffect, useMemo, useState } from "react";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import {
  downloadStudentConceptArtifact,
  downloadStudentSubjectArtifact,
  getStudentFlashcards,
  listPublishedConcepts,
  listPublishedMaterials,
  listPublishedSubjects
} from "@/features/study_material/services/studyMaterialService";
import type {
  ConceptMaterialResponse,
  ConceptResponse,
  FlashcardItem,
  SubjectResponse
} from "@/features/study_material/types";

export const StudentDashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<ConceptResponse[]>([]);
  const [materials, setMaterials] = useState<ConceptMaterialResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [flashcardMeta, setFlashcardMeta] = useState<{
    conceptId: string;
    conceptName: string;
  } | null>(null);
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [flashcardError, setFlashcardError] = useState<string | null>(null);

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
  }, [activeSubjectId]);

  useEffect(() => {
    setFlashcardMeta(null);
    setFlashcards([]);
    setFlashcardIndex(0);
    setFlashcardFlipped(false);
    setFlashcardError(null);
  }, [activeSubjectId]);

  const activeSubject = subjects.find((subject) => subject.subject_id === activeSubjectId);
  const materialMap = useMemo(() => {
    const map = new Map<string, ConceptMaterialResponse>();
    materials.forEach((material) => map.set(material.concept_id, material));
    return map;
  }, [materials]);

  const activeFlashcard = flashcards[flashcardIndex];

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

  return (
    <DashboardLayout title="Student Library" subtitle="Explore published study materials.">
      <PageHeader
        title="Your Study Library"
        subtitle="Browse published syllabi, open flashcards, and download concept materials."
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
                  <div>
                    <p className="list-title">{subject.name}</p>
                    <span className="list-subtitle">Grade {subject.grade_level}</span>
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
                  <p className="muted">Grade {activeSubject.grade_level}</p>
                </div>
                <Badge variant="success">Published</Badge>
              </div>
              {activeSubject.description ? <p>{activeSubject.description}</p> : null}
              <div className="section">
                <div className="section-header">
                  <h4>Subject Pack</h4>
                </div>
                <div className="inline-actions">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadStudentSubjectArtifact(activeSubjectId!, "pdf")}
                  >
                    Subject PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadStudentSubjectArtifact(activeSubjectId!, "pptx")}
                  >
                    Subject PPTX
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadStudentSubjectArtifact(activeSubjectId!, "docx")}
                  >
                    Subject DOCX
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
                  <h4>Topics & Materials</h4>
                </div>
                {concepts.length ? (
                  <div className="topic-grid">
                    {concepts.map((concept) => {
                      const material = materialMap.get(concept.concept_id);
                      return (
                        <Card key={concept.concept_id} className="topic-card">
                          <div className="topic-header">
                            <div>
                              <h4>{concept.name}</h4>
                              <p className="muted">{concept.description || "Concept overview"}</p>
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
                                  variant="ghost"
                                  onClick={() =>
                                    downloadStudentConceptArtifact(
                                      activeSubjectId!,
                                      concept.concept_id,
                                      "pdf"
                                    )
                                  }
                                >
                                  PDF
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    downloadStudentConceptArtifact(
                                      activeSubjectId!,
                                      concept.concept_id,
                                      "pptx"
                                    )
                                  }
                                >
                                  PPTX
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    downloadStudentConceptArtifact(
                                      activeSubjectId!,
                                      concept.concept_id,
                                      "docx"
                                    )
                                  }
                                >
                                  DOCX
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
    </DashboardLayout>
  );
};
