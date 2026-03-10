import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextArea";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { useAppSelector } from "@/hooks/useAppSelector";
import { ApprovedConceptImageGallery } from "@/features/study_material/components/ApprovedConceptImageGallery";
import { LearningBotWidget } from "@/features/study_material/components/LearningBotWidget";
import {
  addStudentBookmark,
  getAdminLearningContent,
  getStudentLearningContent,
  getStudentSubjectProgression,
  listStudentBookmarks,
  markStudentTopicComplete,
  removeStudentBookmark,
  updateAdminLearningContent
} from "@/features/study_material/services/studyMaterialService";
import { startTopicAssessment } from "@/features/quiz/services/quizService";
import type {
  ConceptBookmarkResponse,
  LearningBlock,
  LearningContentResponse,
  LearningSection,
  StudentTopicProgressResponse
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
  const [detailedFocusMap, setDetailedFocusMap] = useState<Record<string, number>>({});
  const [topicProgress, setTopicProgress] = useState<StudentTopicProgressResponse | null>(null);
  const [progressActionLoading, setProgressActionLoading] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const sections = content?.content.sections || [];
  const visibleSections = useMemo(() => pruneSections(sections), [sections]);

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
    if (role !== "student" || !subjectId || !conceptId) {
      setTopicProgress(null);
      return;
    }
    getStudentSubjectProgression(subjectId)
      .then((response) => {
        const currentTopic = response.topics.find((topic) => topic.concept_id === conceptId) || null;
        setTopicProgress(currentTopic);
      })
      .catch(() => setTopicProgress(null));
  }, [role, subjectId, conceptId]);

  useEffect(() => {
    if (!visibleSections.length) {
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

    visibleSections.forEach((section) => {
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
  }, [visibleSections]);

  const navItems = useMemo(() => flattenSections(visibleSections), [visibleSections]);

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
  const topicProgressMeta = useMemo(() => {
    switch (topicProgress?.state) {
      case "passed":
        return { label: "Passed", variant: "success" as const };
      case "ready_for_assessment":
        return { label: "Assessment Ready", variant: "info" as const };
      case "retry_required":
        return { label: "Retry Required", variant: "warning" as const };
      case "available":
        return { label: "Current Topic", variant: "info" as const };
      case "locked":
        return { label: "Locked", variant: "neutral" as const };
      default:
        return null;
    }
  }, [topicProgress]);

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

  const handleMarkTopicComplete = async () => {
    if (!subjectId || !conceptId) {
      return;
    }
    setProgressActionLoading(true);
    setError(null);
    try {
      const response = await markStudentTopicComplete(subjectId, conceptId);
      setTopicProgress(response);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to mark this topic as completed.");
    } finally {
      setProgressActionLoading(false);
    }
  };

  const handleStartAssessment = async () => {
    if (!subjectId || !conceptId) {
      return;
    }
    setProgressActionLoading(true);
    setError(null);
    try {
      const response = await startTopicAssessment({
        subject_id: subjectId,
        concept_id: conceptId
      });
      navigate(`/student/quiz/${response.session.session_id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to start the topic assessment.");
    } finally {
      setProgressActionLoading(false);
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
          {role === "student" && topicProgressMeta ? (
            <Badge variant={topicProgressMeta.variant}>{topicProgressMeta.label}</Badge>
          ) : null}
          {role === "student" && topicProgress ? (
            <Badge variant="info">
              Topic {topicProgress.topic_order} • Pass {topicProgress.pass_percentage}%
            </Badge>
          ) : null}
          {quickRevisionItems.length ? (
            <Button variant="secondary" size="sm" onClick={() => setQuickOpen(true)}>
              Quick Revision
            </Button>
          ) : null}
          {role === "student" && topicProgress?.state === "available" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkTopicComplete}
              disabled={progressActionLoading}
            >
              {progressActionLoading ? "Saving..." : "Mark Topic Complete"}
            </Button>
          ) : null}
          {role === "student" &&
          (topicProgress?.state === "ready_for_assessment" ||
            topicProgress?.state === "retry_required") ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStartAssessment}
              disabled={progressActionLoading}
            >
              {progressActionLoading
                ? "Starting..."
                : topicProgress.state === "retry_required"
                  ? "Retry Assessment"
                  : "Start Assessment"}
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
          {role === "student" && topicProgress ? (
            <div className={`alert ${topicProgress.is_locked ? "danger" : "info"}`}>
              {topicProgress.is_locked
                ? topicProgress.blocker_message
                : topicProgress.state === "available"
                  ? "Finish this topic, then mark it complete to unlock the assessment."
                  : topicProgress.state === "ready_for_assessment"
                    ? `Assessment is ready. You need ${topicProgress.pass_percentage}% to unlock the next topic.`
                    : topicProgress.state === "retry_required"
                      ? `Your latest score was ${topicProgress.latest_score_percent?.toFixed(1) || "0"}%. Review the topic and retry the assessment to unlock the next topic.`
                      : "This topic is passed. You can review it anytime."}
            </div>
          ) : null}
          {role === "student" && subjectId && conceptId ? (
            <ApprovedConceptImageGallery
              subjectId={subjectId}
              conceptId={conceptId}
              conceptName={content.concept_name}
            />
          ) : null}
          {visibleSections.map((section) =>
            renderSection(section, sectionRefs, detailedFocusMap, setDetailedFocusMap)
          )}
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

      {role === "student" && subjectId && conceptId ? (
        <LearningBotWidget
          subjectId={subjectId}
          conceptId={conceptId}
          conceptName={content.concept_name}
          onNavigateToSection={handleScrollTo}
        />
      ) : null}
    </div>
  );
};

type BlockRenderContext = {
  sectionTitle?: string;
  isDetailed?: boolean;
  isStep?: boolean;
  stepTitle?: string;
  stepNumber?: string;
  skipParagraphText?: string;
};

const STEP_TITLE_REGEX = /^step\s*(\d+)\s*[:\.)-]?\s*(.*)$/i;

const parseStepTitle = (title: string) => {
  const match = STEP_TITLE_REGEX.exec(title.trim());
  if (!match) {
    return { number: "", title: title.trim() };
  }
  return { number: match[1] || "", title: (match[2] || "").trim() || title.trim() };
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isStepSection = (section: LearningSection) =>
  section.level === 3 && STEP_TITLE_REGEX.test(section.title);

const isDetailedSection = (section: LearningSection) =>
  section.title.toLowerCase() === "detailed explanation";

const isPracticalExamplesSection = (section: LearningSection) =>
  section.title.toLowerCase() === "practical examples";

const isRedundantStepParagraph = (sectionTitle: string, paragraph: string) => {
  const parsed = parseStepTitle(sectionTitle);
  const titleText = normalizeText(parsed.title || sectionTitle);
  const paragraphText = normalizeText(paragraph);
  if (!titleText || !paragraphText) {
    return false;
  }
  return paragraphText === titleText;
};

const splitSentences = (text: string) => {
  const cleaned = text.trim();
  if (!cleaned) {
    return [];
  }
  return (
    cleaned
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [cleaned]
  );
};

const splitParagraphChunks = (text: string) => {
  const cleaned = text.trim();
  if (!cleaned) {
    return [];
  }
  const sentences = splitSentences(cleaned);
  if (sentences.length <= 2 && cleaned.length <= 260) {
    return [cleaned];
  }
  const chunks: string[] = [];
  let current = "";
  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) {
      return;
    }
    if (!current) {
      current = trimmed;
      return;
    }
    if (current.length + trimmed.length + 1 <= 260) {
      current = `${current} ${trimmed}`;
    } else {
      chunks.push(current);
      current = trimmed;
    }
  });
  if (current) {
    chunks.push(current);
  }
  return chunks;
};

const normalizeExampleSteps = (steps?: string[]) => {
  if (!steps?.length) {
    return [];
  }
  const cleaned = steps
    .map((step) => {
      const trimmed = step.trim();
      if (!trimmed) {
        return "";
      }
      const stripped = trimmed
        .replace(/^[{["']+/, "")
        .replace(/[}\]"']+$/, "")
        .replace(/^(example|description|steps|stepwise_solution|solution|process)\s*[:\-]\s*/i, "")
        .trim();
      return stripped;
    })
    .filter(Boolean);
  const deduped: string[] = [];
  const seen = new Set<string>();
  cleaned.forEach((item) => {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    deduped.push(item);
  });
  return deduped;
};

const hasExampleContent = (section: LearningSection) => {
  const exampleBlock = section.blocks.find((block) => block.type === "example") as
    | { steps?: string[]; result?: string; title?: string; prompt?: string }
    | undefined;
  if (!exampleBlock) {
    return false;
  }
  const steps = normalizeExampleSteps(exampleBlock.steps);
  const title = (exampleBlock.title || "").trim();
  const prompt = (exampleBlock.prompt || "").trim();
  const result = (exampleBlock.result || "").trim();
  return Boolean(title || prompt || result || steps.length);
};

const pruneSections = (sections: LearningSection[]): LearningSection[] => {
  return sections.reduce<LearningSection[]>((acc, section) => {
    const children = section.children?.length ? pruneSections(section.children) : [];
    if (isPracticalExamplesSection(section)) {
      const exampleChildren = children.filter(hasExampleContent);
      if (!exampleChildren.length) {
        return acc;
      }
      acc.push({ ...section, children: exampleChildren });
      return acc;
    }
    const hasBlocks = section.blocks?.length;
    const hasChildren = children.length;
    if (!hasBlocks && !hasChildren) {
      return acc;
    }
    acc.push({ ...section, children });
    return acc;
  }, []);
};

const getStepParagraphText = (section: LearningSection) => {
  if (!isStepSection(section)) {
    return "";
  }
  const paragraphBlock = section.blocks.find((block) => block.type === "paragraph") as
    | { text?: string }
    | undefined;
  return paragraphBlock?.text?.trim() ?? "";
};

const getSectionDisplayTitle = (section: LearningSection) => {
  if (!isStepSection(section)) {
    return section.title;
  }
  const paragraphText = getStepParagraphText(section);
  if (paragraphText) {
    const sentences = splitSentences(paragraphText);
    if (sentences.length) {
      return sentences[0];
    }
  }
  const parsed = parseStepTitle(section.title);
  return parsed.title || section.title;
};

const renderSection = (
  section: LearningSection,
  refs: React.MutableRefObject<Record<string, HTMLElement | null>>,
  detailedFocusMap: Record<string, number>,
  setDetailedFocusMap: React.Dispatch<React.SetStateAction<Record<string, number>>>
): React.ReactNode => {
  const HeadingTag = section.level === 3 ? "h3" : "h2";
  const isStep = isStepSection(section);
  const isDetailed = isDetailedSection(section);
  const stepMeta = isStep ? parseStepTitle(section.title) : null;
  const stepParagraphText = isStep ? getStepParagraphText(section) : "";
  const stepSentences = stepParagraphText ? splitSentences(stepParagraphText) : [];
  const displayStepTitle = isStep
    ? stepSentences[0] || stepMeta?.title || section.title
    : section.title;
  const stepBody = isStep && stepSentences.length > 1 ? stepSentences.slice(1).join(" ").trim() : "";
  const skipParagraphText = isStep && stepParagraphText ? stepParagraphText : undefined;
  const sectionClassName = [
    "learning-section",
    isDetailed ? "learning-section-detailed" : "",
    isStep ? "learning-section-step" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const blockNodes = section.blocks.map((block, index) => (
    <div key={`${section.id}-block-${index}`}>
      {renderBlock(block, {
        sectionTitle: section.title,
        isDetailed: false,
        isStep,
        stepTitle: stepMeta?.title,
        stepNumber: stepMeta?.number,
        skipParagraphText
      })}
    </div>
  ));
  const detailedItems = isDetailed
    ? buildDetailedItems(section.blocks, {
        sectionTitle: section.title,
        isDetailed: true,
        isStep,
        stepTitle: stepMeta?.title,
        stepNumber: stepMeta?.number,
        skipParagraphText
      })
    : [];
  const detailedActiveIndex = isDetailed
    ? Math.min(
        Math.max(detailedFocusMap[section.id] ?? 0, 0),
        Math.max(detailedItems.length - 1, 0)
      )
    : 0;
  const blockContent = isDetailed ? (
    <div className="learning-explain-stack">
      {detailedItems.map((item, index) => {
        const isActive = index === detailedActiveIndex;
        return (
          <button
            key={item.key}
            type="button"
            className={`learning-explain-card ${isActive ? "active" : "dimmed"}`}
            aria-expanded={isActive}
            onClick={() =>
              setDetailedFocusMap((prev) => ({ ...prev, [section.id]: index }))
            }
          >
            <div className="learning-explain-index">{index + 1}</div>
            <div className="learning-explain-body">
              <p className="learning-explain-lead">{item.lead}</p>
              <div className={`learning-explain-content ${isActive ? "open" : ""}`}>
                {item.body}
              </div>
              <span className="learning-explain-toggle">
                {isActive ? "Focused" : "Tap to expand"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  ) : (
    <>{blockNodes}</>
  );

  return (
    <section
      key={section.id}
      id={section.id}
      className={sectionClassName}
      ref={(el) => {
        refs.current[section.id] = el;
      }}
    >
      {isStep ? (
        <div className="learning-step-card">
          <div className="learning-step-head">
            <span className="learning-step-badge">
              {stepMeta?.number ? `Step ${stepMeta.number}` : "Step"}
            </span>
            <HeadingTag className="learning-step-title">{displayStepTitle || section.title}</HeadingTag>
          </div>
          {stepBody ? <p className="learning-paragraph learning-step-body">{stepBody}</p> : null}
          {blockContent}
        </div>
      ) : (
        <>
          <HeadingTag>{section.title}</HeadingTag>
          {blockContent}
        </>
      )}
      {section.children?.map((child) =>
        renderSection(child, refs, detailedFocusMap, setDetailedFocusMap)
      )}
    </section>
  );
};

const renderListBlock = (block: { style: "bullet" | "number"; items: string[] }) =>
  block.style === "number" ? (
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

const formatExampleStyle = (value?: string) => {
  const cleaned = (value || "").trim().toLowerCase();
  if (!cleaned) {
    return "";
  }
  if (cleaned === "calculation") {
    return "Worked Calculation";
  }
  if (cleaned === "derivation") {
    return "Derivation";
  }
  if (cleaned === "scenario") {
    return "Application";
  }
  return cleaned
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
};

const renderBlock = (block: LearningBlock, context?: BlockRenderContext) => {
  switch (block.type) {
    case "paragraph":
      if (context?.skipParagraphText) {
        const target = normalizeText(context.skipParagraphText);
        if (target && normalizeText(block.text) === target) {
          return null;
        }
      }
      if (context?.isStep && context.sectionTitle && isRedundantStepParagraph(context.sectionTitle, block.text)) {
        return null;
      }
      return <p className="learning-paragraph">{block.text}</p>;
    case "list":
      return renderListBlock(block);
    case "formula":
      return (
        <div className="formula-block">
          {block.title ? <p className="formula-title">{block.title}</p> : null}
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
      {
        const steps = normalizeExampleSteps(block.steps);
        const prompt = (block.prompt || "").trim();
        const resultText = (block.result || "").trim();
        const exampleStyle = formatExampleStyle(block.example_style);
        const result =
          resultText && !resultText.toLowerCase().startsWith("result")
            ? `Result: ${resultText}`
            : resultText;
        if (!steps.length && !result && !block.title && !prompt) {
          return null;
        }
        return (
          <div className="example-block">
            {(block.title || exampleStyle) ? (
              <div className="example-header">
                {exampleStyle ? <span className="example-chip">{exampleStyle}</span> : null}
                {block.title ? <p className="example-title">{block.title}</p> : null}
              </div>
            ) : null}
            {prompt ? <p className="example-prompt">{prompt}</p> : null}
            {steps.length ? (
              <div className="example-steps">
                {steps.map((step, index) => (
                  <div key={`${step}-${index}`} className="example-step">
                    <span className="example-step-index">{index + 1}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {result ? <p className="muted">{result}</p> : null}
          </div>
        );
      }
    default:
      return null;
  }
};

const buildDetailedItems = (
  blocks: LearningBlock[],
  context?: BlockRenderContext
) => {
  const items: Array<{ key: string; lead: string; body: React.ReactNode }> = [];
  blocks.forEach((block, blockIndex) => {
    if (block.type === "paragraph") {
      if (context?.skipParagraphText) {
        const target = normalizeText(context.skipParagraphText);
        if (target && normalizeText(block.text) === target) {
          return;
        }
      }
      const chunks = splitParagraphChunks(block.text);
      chunks.forEach((chunk, chunkIndex) => {
        const sentences = splitSentences(chunk);
        const lead = sentences[0] || chunk;
        const rest =
          sentences.length > 1 ? sentences.slice(1).join(" ").trim() : "";
        items.push({
          key: `detailed-paragraph-${blockIndex}-${chunkIndex}`,
          lead,
          body: rest ? <p className="learning-paragraph">{rest}</p> : null
        });
      });
      return;
    }
    if (block.type === "list") {
      items.push({
        key: `detailed-list-${blockIndex}`,
        lead: "Key Points",
        body: renderListBlock(block)
      });
      return;
    }
    const node = renderBlock(block, { ...context, isDetailed: false });
    if (node) {
      let lead = "Focus Note";
      if (block.type === "formula") {
        lead = block.title?.trim() || "Formula";
      } else if (block.type === "example") {
        lead = block.title?.trim() || "Example";
      } else if (block.type === "callout") {
        lead = block.title?.trim() || "Important";
      } else if (block.type === "code") {
        lead = "Code Example";
      }
      items.push({
        key: `detailed-block-${blockIndex}`,
        lead,
        body: node
      });
    }
  });
  return items;
};

const flattenSections = (sections: LearningSection[]) => {
  const items: { id: string; title: string; level: number }[] = [];
  sections.forEach((section) => {
    items.push({ id: section.id, title: getSectionDisplayTitle(section), level: section.level });
    if (section.children?.length) {
      section.children.forEach((child) => {
        items.push({ id: child.id, title: getSectionDisplayTitle(child), level: child.level });
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
