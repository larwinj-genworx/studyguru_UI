import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getQuizReport,
  getQuizSession,
  submitQuizAnswer
} from "@/features/quiz/services/quizService";
import type {
  QuizAnswerResponse,
  QuizQuestionResponse,
  QuizReportResponse,
  QuizSessionResponse
} from "@/features/quiz/types";

export const StudentQuizPage: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSessionResponse | null>(null);
  const [question, setQuestion] = useState<QuizQuestionResponse | null>(null);
  const [report, setReport] = useState<QuizReportResponse | null>(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompleted = session?.status === "completed";

  useEffect(() => {
    if (!sessionId) {
      navigate("/student");
      return;
    }
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getQuizSession(sessionId);
        setSession(response.session);
        setQuestion(response.question);
        setHint(null);
        if (response.session.status === "completed") {
          const reportResponse = await getQuizReport(sessionId);
          setReport(reportResponse);
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Unable to load quiz session.");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId, navigate]);

  const progressPercent = useMemo(() => {
    if (!session || !question) {
      return 0;
    }
    return Math.round((question.position / question.total) * 100);
  }, [session, question]);

  const handleSubmit = async () => {
    if (!sessionId || !question || !selectedOption) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response: QuizAnswerResponse = await submitQuizAnswer(sessionId, {
        question_id: question.question_id,
        selected_option: selectedOption
      });
      setSession(response.session);
      setHint(response.hint ?? null);
      if (response.completed && response.report) {
        setReport(response.report);
        setQuestion(null);
      } else if (response.next_question) {
        setQuestion(response.next_question);
        setSelectedOption("");
        setHint(null);
      } else if (!response.correct) {
        setSelectedOption("");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Unable to submit answer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Student Quiz" subtitle="Answer carefully and use hints wisely.">
      <PageHeader
        title="Custom Quiz Session"
        subtitle="Questions are generated based on your selected topics and difficulty level."
      />

      {error ? <div className="alert danger">{error}</div> : null}

      {loading ? (
        <div className="loading-overlay">
          <LoadingSpinner />
        </div>
      ) : null}

      {report ? (
        <div className="quiz-report">
          <Card className="quiz-report-card">
            <div className="quiz-report-header">
              <div>
                <p className="eyebrow">Final Report</p>
                <h2>{report.subject_name} Quiz Summary</h2>
                <p className="muted">
                  Accuracy: {(report.accuracy * 100).toFixed(1)}% · Correct:{" "}
                  {report.correct_count}/{report.total_questions}
                </p>
              </div>
              <Badge variant="success">Completed</Badge>
            </div>
            <div className="quiz-report-grid">
              {report.topic_breakdown.map((topic) => (
                <div key={topic.concept_id} className={`quiz-topic ${topic.status}`}>
                  <div>
                    <p className="quiz-topic-title">{topic.concept_name}</p>
                    <p className="muted">
                      {Math.round(topic.accuracy * 100)}% accuracy ·{" "}
                      {topic.correct_count}/{topic.total_questions}
                    </p>
                  </div>
                  <ul className="quiz-topic-notes">
                    {topic.recommendations.map((note, index) => (
                      <li key={`${topic.concept_id}-note-${index}`}>{note}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="quiz-report-footer">
              <div>
                <h4>Next Steps</h4>
                <ul className="quiz-topic-notes">
                  {report.recommendations.map((item, index) => (
                    <li key={`rec-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="inline-actions">
                <Button variant="secondary" onClick={() => navigate("/student")}>
                  Back to Library
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="quiz-shell">
          <Card className="quiz-header-card">
            <div className="quiz-header-main">
              <div>
                <p className="eyebrow">Active Assessment</p>
                <h2>{session?.subject_name || "Quiz Session"}</h2>
                <p className="muted">
                  {session?.topics?.length || 0} selected topics ·{" "}
                  {session?.total_questions || 0} questions
                </p>
              </div>
              <Badge variant="info">In Progress</Badge>
            </div>
            <div className="progress quiz-progress">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="progress-meta">
                <span>Question {question?.position || 0}</span>
                <span>{progressPercent}% complete</span>
              </div>
            </div>
          </Card>

          <div className="quiz-body">
            <Card className="quiz-question-card">
              <div className="quiz-question-header">
                <div>
                  <p className="quiz-question-label">{question?.concept_name || "Concept"}</p>
                  <h3>{question?.question || "Question"}</h3>
                </div>
                <Badge variant="neutral">{question?.difficulty || "medium"}</Badge>
              </div>
              <div className="quiz-options">
                {question?.options.map((option) => (
                  <button
                    key={option}
                    className={`quiz-option ${selectedOption === option ? "selected" : ""}`}
                    onClick={() => setSelectedOption(option)}
                    disabled={submitting || isCompleted}
                  >
                    <span className="quiz-option-dot" />
                    <span>{option}</span>
                  </button>
                ))}
              </div>
              {hint ? (
                <div className="quiz-hint">
                  <div>
                    <p className="quiz-hint-title">Hint</p>
                    <p>{hint}</p>
                  </div>
                </div>
              ) : null}
              <div className="quiz-actions">
                <Button
                  variant="secondary"
                  disabled={!selectedOption || submitting || isCompleted}
                  onClick={handleSubmit}
                >
                  {submitting ? "Checking..." : "Submit Answer"}
                </Button>
                <Button variant="ghost" onClick={() => navigate("/student")}>
                  Exit
                </Button>
              </div>
            </Card>

            <Card className="quiz-side-panel">
              <div className="quiz-side-header">
                <h4>Session Insights</h4>
                <p className="muted">Track your progress in real time.</p>
              </div>
              <div className="quiz-stat-grid">
                <div className="quiz-stat">
                  <p className="quiz-stat-label">First Attempt Correct</p>
                  <h3>{session?.first_attempt_correct_count || 0}</h3>
                </div>
              </div>
              <div className="quiz-topic-list">
                {session?.topics?.map((topic) => (
                  <div key={topic.concept_id} className="quiz-topic-pill">
                    <span>{topic.concept_name}</span>
                    <Badge variant="info">{topic.question_count} Qs</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
