import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextArea";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  addStudentBookmark,
  getAdminLearningContent,
  getStudentLearningContent,
  listStudentBookmarks,
  removeStudentBookmark,
  updateAdminLearningContent
} from "@/features/study_material/services/studyMaterialService";
import type {
  ConceptBookmarkResponse,
  LearningBlock,
  LearningContentResponse,
  LearningSection
} from "@/features/study_material/types";

export const ConceptLearningPage: React.FC = () => {
  const { subjectId, conceptId } = useParams();
  const navigate = useNavigate();
  const { role } = useAppSelector((state) => state.auth);

  const [content, setContent] = useState<LearningContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<ConceptBookmarkResponse[]>([]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const sections = content?.content.sections || [];

  useEffect(() => {
    if (!subjectId || !conceptId) {
      return;
    }
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response =
          role === "admin"
            ? await getAdminLearningContent(subjectId, conceptId)
            : await getStudentLearningContent(subjectId, conceptId);
        setContent(response);
        setActiveSectionId(response.content.sections[0]?.id ?? null);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load learning content.");
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [subjectId, conceptId, role]);

  useEffect(() => {
    if (role !== "student" || !subjectId) {
      return;
    }
    listStudentBookmarks(subjectId)
      .then((items) => setBookmarks(items))
      .catch(() => setBookmarks([]));
  }, [role, subjectId, conceptId]);

  useEffect(() => {
    if (!sections.length) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0.1 }
    );

    sections.forEach((section) => {
      const element = sectionRefs.current[section.id];
      if (element) {
        observer.observe(element);
      }
      section.children?.forEach((child) => {
        const childEl = sectionRefs.current[child.id];
        if (childEl) {
          observer.observe(childEl);
        }
      });
    });

    return () => observer.disconnect();
  }, [sections]);

  const navItems = useMemo(() => flattenSections(sections), [sections]);

  const quickRevisionItems = useMemo(() => {
    const quickSection = findSectionByTitle(sections, "Quick Revision");
    if (!quickSection) {
      return [];
    }
    const listBlock = quickSection.blocks.find((block) => block.type === "list") as
      | { items?: string[] }
      | undefined;
    return listBlock?.items || [];
  }, [sections]);

  const bookmarked = useMemo(
    () => bookmarks.some((item) => item.concept_id === conceptId),
    [bookmarks, conceptId]
  );

  const handleScrollTo = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleToggleBookmark = async () => {
    if (!subjectId || !conceptId) {
      return;
    }
    try {
      if (bookmarked) {
        await removeStudentBookmark(subjectId, conceptId);
        setBookmarks((prev) => prev.filter((item) => item.concept_id !== conceptId));
      } else if (content) {
        await addStudentBookmark(subjectId, conceptId);
        setBookmarks((prev) => [
          ...prev,
          {
            concept_id: content.concept_id,
            concept_name: content.concept_name,
            subject_id: content.subject_id,
            subject_name: content.subject_name,
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update bookmark.");
    }
  };

  const handleOpenEdit = () => {
    if (!content) {
      return;
    }
    setEditError(null);
    setEditValue(JSON.stringify(content.content, null, 2));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!subjectId || !conceptId || !content) {
      return;
    }
    try {
      const parsed = JSON.parse(editValue);
      const response = await updateAdminLearningContent(subjectId, conceptId, parsed);
      setContent(response);
      setEditOpen(false);
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || err?.message || "Invalid JSON payload.");
    }
  };

  if (loading) {
    return (
      <div className="learning-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="learning-shell">
        <div className="alert danger">{error}</div>
      </div>
    );
  }

  if (!content) {
    return <EmptyState title="No content yet" description="Learning content is not available." />;
  }

  return (
    <div className="learning-page">
      <header className="learning-topbar">
        <div>
          <p className="eyebrow">StudyGuru Learning</p>
          <h1>{content.concept_name}</h1>
          <p className="muted">
            {content.subject_name} - Grade {content.grade_level}
          </p>
        </div>
        <div className="learning-topbar-actions">
          <Badge variant={content.lifecycle_status === "published" ? "success" : "warning"}>
            {content.lifecycle_status}
          </Badge>
          {quickRevisionItems.length ? (
            <Button variant="secondary" size="sm" onClick={() => setQuickOpen(true)}>
              Quick Revision
            </Button>
          ) : null}
          {role === "student" ? (
            <Button variant={bookmarked ? "secondary" : "ghost"} size="sm" onClick={handleToggleBookmark}>
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </Button>
          ) : null}
          {role === "admin" ? (
            <Button variant="ghost" size="sm" onClick={handleOpenEdit}>
              Edit Content
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(role === "admin" ? "/admin" : "/student")}
          >
            Back to Library
          </Button>
        </div>
      </header>

      <div className="learning-shell">
        <aside className="learning-nav">
          <p className="sidebar-label">Sections</p>
          <div className="learning-nav-list">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`learning-nav-item level-${item.level} ${
                  activeSectionId === item.id ? "active" : ""
                }`}
                onClick={() => handleScrollTo(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>
        </aside>

        <main className="learning-content">
          {sections.map((section) => renderSection(section, sectionRefs))}
        </main>
      </div>

      <Modal
        open={quickOpen}
        title="Quick Revision"
        onClose={() => setQuickOpen(false)}
        className="viewer-modal"
        bodyClassName="viewer-body"
      >
        {quickRevisionItems.length ? (
          <div className="learning-quick">
            <ul>
              {quickRevisionItems.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState title="No quick revision yet" description="Quick revision notes are missing." />
        )}
      </Modal>

      <Modal
        open={editOpen}
        title="Edit Learning Content"
        onClose={() => setEditOpen(false)}
        footer={
          <div className="inline-actions">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </div>
        }
      >
        <div className="form-stack">
          {editError ? <div className="alert danger">{editError}</div> : null}
          <TextArea
            label="Learning Content (JSON)"
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            rows={14}
          />
        </div>
      </Modal>
    </div>
  );
};

const renderSection = (
  section: LearningSection,
  refs: React.MutableRefObject<Record<string, HTMLElement | null>>
): React.ReactNode => {
  const HeadingTag = section.level === 3 ? "h3" : "h2";
  return (
    <section
      key={section.id}
      id={section.id}
      className="learning-section"
      ref={(el) => {
        refs.current[section.id] = el;
      }}
    >
      <HeadingTag>{section.title}</HeadingTag>
      {section.blocks.map((block, index) => (
        <div key={`${section.id}-block-${index}`}>{renderBlock(block)}</div>
      ))}
      {section.children?.map((child) => renderSection(child, refs))}
    </section>
  );
};

const renderBlock = (block: LearningBlock) => {
  switch (block.type) {
    case "paragraph":
      return <p className="learning-paragraph">{block.text}</p>;
    case "list":
      return block.style === "number" ? (
        <ol className="learning-list">
          {block.items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="learning-list">
          {block.items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      );
    case "formula":
      return (
        <div className="formula-block">
          <div className="formula-expression">{block.formula}</div>
          <div className="formula-variables">
            <p className="formula-label">Variables</p>
            <ul>
              {(block.variables || []).map((variable, index) => (
                <li key={`${variable.symbol}-${index}`}>
                  <strong>{variable.symbol}</strong>: {variable.meaning}
                </li>
              ))}
            </ul>
          </div>
          {block.explanation ? <p className="muted">{block.explanation}</p> : null}
          {block.example ? <p className="muted">Example: {block.example}</p> : null}
        </div>
      );
    case "code":
      return (
        <pre className="code-block">
          <code>{block.code}</code>
        </pre>
      );
    case "callout":
      return (
        <div className={`callout ${block.variant}`}>
          {block.title ? <p className="callout-title">{block.title}</p> : null}
          {Array.isArray(block.content) ? (
            <ul>
              {block.content.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>{block.content}</p>
          )}
        </div>
      );
    case "example":
      return (
        <div className="example-block">
          {block.title ? <p className="example-title">{block.title}</p> : null}
          {block.steps?.length ? (
            <div className="example-steps">
              {block.steps.map((step, index) => (
                <div key={`${step}-${index}`} className="example-step">
                  <span className="example-step-index">{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          ) : null}
          {block.result ? <p className="muted">{block.result}</p> : null}
        </div>
      );
    default:
      return null;
  }
};

const flattenSections = (sections: LearningSection[]) => {
  const items: { id: string; title: string; level: number }[] = [];
  sections.forEach((section) => {
    items.push({ id: section.id, title: section.title, level: section.level });
    if (section.children?.length) {
      section.children.forEach((child) => {
        items.push({ id: child.id, title: child.title, level: child.level });
      });
    }
  });
  return items;
};

const findSectionByTitle = (sections: LearningSection[], title: string) => {
  for (const section of sections) {
    if (section.title.toLowerCase() === title.toLowerCase()) {
      return section;
    }
    if (section.children?.length) {
      const child = section.children.find(
        (item) => item.title.toLowerCase() === title.toLowerCase()
      );
      if (child) {
        return child;
      }
    }
  }
  return null;
};
