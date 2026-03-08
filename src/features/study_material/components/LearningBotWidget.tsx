import React, { useEffect, useMemo, useRef, useState } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import {
  getLearningBotSession,
  resetLearningBotSession,
  sendLearningBotMessage
} from "@/features/study_material/services/studyMaterialService";
import type {
  LearningBotCitation,
  LearningBotMessageResponse,
  LearningBotSessionDetailResponse
} from "@/features/study_material/types";

interface LearningBotWidgetProps {
  subjectId: string;
  conceptId: string;
  conceptName: string;
  onNavigateToSection: (sectionId: string) => void;
}

export const LearningBotWidget: React.FC<LearningBotWidgetProps> = ({
  subjectId,
  conceptId,
  conceptName,
  onNavigateToSection
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<LearningBotSessionDetailResponse | null>(null);
  const [messages, setMessages] = useState<LearningBotMessageResponse[]>([]);
  const [input, setInput] = useState("");
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getLearningBotSession(subjectId, conceptId);
        if (!active) {
          return;
        }
        setSession(response);
        setMessages(response.messages);
      } catch (err: any) {
        if (!active) {
          return;
        }
        setError(err?.response?.data?.detail || "Failed to load the learning assistant.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadSession();
    return () => {
      active = false;
    };
  }, [subjectId, conceptId]);

  useEffect(() => {
    if (!feedRef.current) {
      return;
    }
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, open]);

  const suggestions = useMemo(() => {
    const latestAssistant = [...messages].reverse().find((item) => item.role === "assistant");
    if (latestAssistant?.follow_up_suggestions?.length) {
      return latestAssistant.follow_up_suggestions.slice(0, 3);
    }
    return session?.suggested_prompts || [];
  }, [messages, session]);

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || sending) {
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: LearningBotMessageResponse = {
      message_id: tempId,
      role: "user",
      content: trimmed,
      citations: [],
      follow_up_suggestions: [],
      meta: {},
      created_at: new Date().toISOString()
    };
    setSending(true);
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const response = await sendLearningBotMessage(subjectId, conceptId, trimmed);
      setMessages((prev) => {
        const withoutTemp = prev.filter((item) => item.message_id !== tempId);
        return [...withoutTemp, response.user_message, response.assistant_message];
      });
      setSession((prev) =>
        prev
          ? {
              ...prev,
              session: response.session
            }
          : null
      );
      setOpen(true);
    } catch (err: any) {
      setMessages((prev) => prev.filter((item) => item.message_id !== tempId));
      setInput(trimmed);
      setError(err?.response?.data?.detail || "Failed to get a reply from the learning assistant.");
    } finally {
      setSending(false);
    }
  };

  const handleReset = async () => {
    if (sending) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await resetLearningBotSession(subjectId, conceptId);
      setSession(response);
      setMessages(response.messages);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to reset this learning conversation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  return (
    <div className={`learning-bot-shell ${open ? "open" : ""}`}>
      <button
        type="button"
        className={`learning-bot-launcher ${open ? "hidden" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Open learning assistant"
      >
        <span className="learning-bot-launcher-ring" />
        <span className="learning-bot-launcher-icon">AI</span>
        <span className="learning-bot-launcher-copy">
          <strong>Study Coach</strong>
          <small>Ask about {conceptName}</small>
        </span>
      </button>

      {open ? (
        <section className="learning-bot-panel" aria-label="Learning assistant">
          <header className="learning-bot-header">
            <div>
              <p className="learning-bot-kicker">Grounded concept tutor</p>
              <h3>{session?.session.concept_name || conceptName}</h3>
              <p className="learning-bot-subtitle">
                Uses your lesson first, then searches outside only when needed.
              </p>
            </div>
            <div className="learning-bot-header-actions">
              <Button type="button" variant="ghost" size="sm" onClick={handleReset} disabled={loading || sending}>
                Reset
              </Button>
              <button
                type="button"
                className="learning-bot-close"
                onClick={() => setOpen(false)}
                aria-label="Close learning assistant"
              >
                Close
              </button>
            </div>
          </header>

          <div className="learning-bot-body" ref={feedRef}>
            {loading ? (
              <div className="learning-bot-state">
                <LoadingSpinner />
                <p>Preparing your concept tutor…</p>
              </div>
            ) : null}

            {!loading && !messages.length ? (
              <div className="learning-bot-empty">
                <div className="learning-bot-empty-card">
                  <p className="learning-bot-empty-label">Start with a focused question</p>
                  <h4>Ask for an explanation, example, formula help, or quick practice.</h4>
                  <p>
                    The assistant stays centered on <strong>{conceptName}</strong> and gives grounded answers.
                  </p>
                </div>
              </div>
            ) : null}

            {!loading
              ? messages.map((message) => (
                  <article
                    key={message.message_id}
                    className={`learning-bot-message ${message.role === "assistant" ? "assistant" : "user"}`}
                  >
                    <div className="learning-bot-message-meta">
                      <span>{message.role === "assistant" ? "Study Coach" : "You"}</span>
                    </div>
                    <div className="learning-bot-bubble">
                      <RichMessageText value={message.content} />
                    </div>
                    {message.role === "assistant" && message.citations.length ? (
                      <div className="learning-bot-citations">
                        {message.citations.map((citation) => (
                          <CitationChip
                            key={`${message.message_id}-${citation.source_id}`}
                            citation={citation}
                            onNavigateToSection={onNavigateToSection}
                          />
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              : null}

            {sending ? (
              <article className="learning-bot-message assistant pending">
                <div className="learning-bot-message-meta">
                  <span>Study Coach</span>
                </div>
                <div className="learning-bot-bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            ) : null}
          </div>

          <div className="learning-bot-footer">
            {error ? <div className="alert danger">{error}</div> : null}
            {suggestions.length ? (
              <div className="learning-bot-suggestions">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="learning-bot-suggestion"
                    onClick={() => void sendMessage(item)}
                    disabled={sending || loading}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
            <form className="learning-bot-composer" onSubmit={handleSubmit}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={`Ask anything about ${conceptName}`}
                rows={2}
                disabled={sending || loading}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
              />
              <Button type="submit" size="sm" disabled={sending || loading || !input.trim()}>
                Send
              </Button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
};

const CitationChip: React.FC<{
  citation: LearningBotCitation;
  onNavigateToSection: (sectionId: string) => void;
}> = ({ citation, onNavigateToSection }) => {
  const isInternal = citation.source_type === "internal" && citation.section_id;

  if (isInternal) {
    return (
      <button
        type="button"
        className="learning-bot-citation"
        onClick={() => onNavigateToSection(citation.section_id || "")}
      >
        <span>{citation.label}</span>
        <small>{citation.note || "Lesson section"}</small>
      </button>
    );
  }

  return (
    <a
      className="learning-bot-citation"
      href={citation.url || "#"}
      target="_blank"
      rel="noreferrer"
    >
      <span>{citation.label}</span>
      <small>{citation.note || "External source"}</small>
    </a>
  );
};

const RichMessageText: React.FC<{ value: string }> = ({ value }) => {
  const lines = value.split("\n").map((line) => line.trimEnd());
  return (
    <div className="learning-bot-rich-text">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={`spacer-${index}`} className="learning-bot-spacer" />;
        }
        if (/^(\d+[\.\)])\s+/.test(trimmed) || /^-\s+/.test(trimmed)) {
          return (
            <p key={`line-${index}`} className="learning-bot-list-line">
              {trimmed}
            </p>
          );
        }
        return <p key={`line-${index}`}>{trimmed}</p>;
      })}
    </div>
  );
};
