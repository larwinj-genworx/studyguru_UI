import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { getAdminStudentActivity } from "@/features/study_material/services/studyMaterialService";
import type {
  AdminStudentActivityResponse,
  AdminStudentConceptActivityResponse
} from "@/features/study_material/types";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }
  return date.toLocaleString();
};

const formatAccuracy = (value?: number | null) => {
  if (typeof value !== "number") {
    return "N/A";
  }
  return `${Math.round(value * 100)}%`;
};

const formatScorePercent = (value?: number | null) => {
  if (typeof value !== "number") {
    return "N/A";
  }
  return `${Math.round(value)}%`;
};

const getConceptStatusMeta = (
  status: AdminStudentConceptActivityResponse["status"]
) => {
  switch (status) {
    case "strong":
      return { label: "Strong", variant: "success" as const, tone: "strong" };
    case "needs_support":
      return { label: "Needs Support", variant: "warning" as const, tone: "support" };
    case "active":
      return { label: "Active", variant: "info" as const, tone: "active" };
    default:
      return { label: "Not Started", variant: "neutral" as const, tone: "idle" };
  }
};

const getProgressStateMeta = (state?: AdminStudentConceptActivityResponse["progress_state"]) => {
  switch (state) {
    case "passed":
      return { label: "Passed", variant: "success" as const };
    case "retry_required":
      return { label: "Retry Required", variant: "warning" as const };
    case "ready_for_assessment":
      return { label: "Assessment Ready", variant: "info" as const };
    case "available":
      return { label: "Learning In Progress", variant: "neutral" as const };
    case "locked":
      return { label: "Locked", variant: "neutral" as const };
    default:
      return { label: "Pending", variant: "neutral" as const };
  }
};

const getQuizStatusMeta = (status: string) => {
  switch (status) {
    case "completed":
      return { label: "Completed", variant: "success" as const };
    case "abandoned":
      return { label: "Abandoned", variant: "warning" as const };
    default:
      return { label: "In Progress", variant: "info" as const };
  }
};

const getQuizTypeMeta = (
  sessionType: "custom_practice" | "topic_assessment",
  passed?: boolean | null
) => {
  if (sessionType === "topic_assessment") {
    if (passed === true) {
      return { label: "Assessment Passed", variant: "success" as const };
    }
    if (passed === false) {
      return { label: "Assessment Retry", variant: "warning" as const };
    }
    return { label: "Topic Assessment", variant: "info" as const };
  }
  return { label: "Practice Quiz", variant: "neutral" as const };
};

export const AdminStudentActivityPage: React.FC = () => {
  const { subjectId, studentId } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<AdminStudentActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId || !studentId) {
      navigate("/admin");
      return;
    }

    const fetchActivity = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAdminStudentActivity(subjectId, studentId);
        setActivity(response);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Unable to load student activity.");
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [navigate, studentId, subjectId]);

  const orderedConceptActivity = useMemo(() => {
    if (!activity) {
      return [];
    }
    return [...activity.concept_activity].sort((left, right) => left.topic_order - right.topic_order);
  }, [activity]);

  return (
    <DashboardLayout
      title="Student Activity"
      subtitle="Review ordered progression, learning behaviour, and assessment outcomes."
    >
      <PageHeader
        title={activity?.student_email ?? "Student Activity"}
        subtitle={
          activity
            ? `${activity.subject_name} • Grade ${activity.grade_level}`
            : "Detailed engagement view for a single enrolled student."
        }
        actions={
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            Back to Admin
          </Button>
        }
      />

      {error ? <div className="alert danger">{error}</div> : null}

      {loading ? (
        <div className="loading-overlay">
          <LoadingSpinner />
        </div>
      ) : null}

      {!activity && !loading ? (
        <Card className="panel">
          <EmptyState
            title="No activity found"
            description="The selected student activity record could not be loaded."
          />
        </Card>
      ) : null}

      {activity ? (
        <>
          <Card className="panel analytics-hero-card">
            <div className="analytics-hero-header">
              <div>
                <p className="eyebrow">Enrollment Overview</p>
                <h2>{activity.student_email}</h2>
                <p className="muted">
                  Enrolled on {formatDateTime(activity.enrolled_at)} • Last activity{" "}
                  {formatDateTime(activity.overview.last_activity_at)}
                </p>
              </div>
              <div className="inline-actions">
                <Badge variant="success">
                  {activity.overview.completed_topics}/{activity.overview.total_concepts} topics passed
                </Badge>
                <Badge variant="info">
                  {activity.overview.current_topic_order
                    ? `Current Topic ${activity.overview.current_topic_order}`
                    : "All topics unlocked"}
                </Badge>
              </div>
            </div>

            <div className="analytics-overview-grid">
              <div className="analytics-stat-card">
                <span>Progress</span>
                <strong>{activity.overview.progress_percent}%</strong>
                <p>{activity.overview.completed_topics} topics passed</p>
              </div>
              <div className="analytics-stat-card">
                <span>Assessments Passed</span>
                <strong>{activity.overview.passed_assessments}</strong>
                <p>
                  {activity.overview.failed_assessments
                    ? `${activity.overview.failed_assessments} topic(s) need retry`
                    : "No retry blockers"}
                </p>
              </div>
              <div className="analytics-stat-card">
                <span>Average Score</span>
                <strong>{formatAccuracy(activity.overview.average_quiz_accuracy)}</strong>
                <p>Best {formatAccuracy(activity.overview.best_quiz_accuracy)}</p>
              </div>
              <div className="analytics-stat-card">
                <span>Learning Sessions</span>
                <strong>{activity.overview.learning_sessions}</strong>
                <p>{activity.overview.learning_messages} bot messages</p>
              </div>
              <div className="analytics-stat-card">
                <span>Current Topic</span>
                <strong>
                  {activity.overview.current_topic_order
                    ? `Topic ${activity.overview.current_topic_order}`
                    : "Completed"}
                </strong>
                <p>{activity.overview.current_topic_name ?? "No pending topic"}</p>
              </div>
            </div>
          </Card>

          <div className="analytics-layout">
            <div className="stack">
              <Card className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Topic Progress</h3>
                    <p className="muted">
                      Ordered topic progression, pass requirements, and retry blockers.
                    </p>
                  </div>
                </div>
                {orderedConceptActivity.length ? (
                  <div className="analytics-topic-grid">
                    {orderedConceptActivity.map((concept) => {
                      const statusMeta = getConceptStatusMeta(concept.status);
                      const progressMeta = getProgressStateMeta(concept.progress_state);
                      return (
                        <div
                          key={concept.concept_id}
                          className={`analytics-topic-card ${statusMeta.tone}`}
                        >
                          <div className="analytics-topic-header">
                            <div>
                              <h4>
                                Topic {concept.topic_order}: {concept.concept_name}
                              </h4>
                              <p className="muted">
                                Pass requirement {concept.pass_percentage}% • Last activity{" "}
                                {formatDateTime(concept.last_activity_at)}
                              </p>
                            </div>
                            <div className="inline-actions">
                              <Badge variant={progressMeta.variant}>{progressMeta.label}</Badge>
                              {concept.is_current ? <Badge variant="info">Current</Badge> : null}
                              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                            </div>
                          </div>

                          <div className="analytics-topic-metrics">
                            <div>
                              <span>Assessment Attempts</span>
                              <strong>{concept.assessment_attempts}</strong>
                            </div>
                            <div>
                              <span>Latest Score</span>
                              <strong>{formatScorePercent(concept.latest_score_percent)}</strong>
                            </div>
                            <div>
                              <span>Best Score</span>
                              <strong>{formatScorePercent(concept.best_score_percent)}</strong>
                            </div>
                          </div>

                          <div className="analytics-topic-footer">
                            <span>
                              {concept.passed_at
                                ? `Passed ${formatDateTime(concept.passed_at)}`
                                : concept.learning_completed_at
                                  ? `Learning completed ${formatDateTime(concept.learning_completed_at)}`
                                  : concept.has_bookmark
                                    ? "Bookmarked for revision"
                                    : "No bookmark yet"}
                            </span>
                            <span>
                              {concept.blocker_message || `${concept.learning_sessions} bot session(s)`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No topic activity yet"
                    description="Topic-level progress will appear once the student starts studying."
                  />
                )}
              </Card>

              <Card className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Test Reports</h3>
                    <p className="muted">
                      Practice quizzes and topic assessments are separated here with scoring context.
                    </p>
                  </div>
                </div>
                {activity.quiz_reports.length ? (
                  <div className="analytics-report-list">
                    {activity.quiz_reports.map((report) => {
                      const quizStatus = getQuizStatusMeta(report.status);
                      const quizType = getQuizTypeMeta(report.session_type, report.passed);
                      return (
                        <div key={report.session_id} className="analytics-report-card">
                          <div className="analytics-report-header">
                            <div>
                              <h4>
                                {report.session_type === "topic_assessment"
                                  ? "Topic Assessment"
                                  : "Practice Quiz"}{" "}
                                {report.session_id.slice(0, 8)}
                              </h4>
                              <p className="muted">
                                Started {formatDateTime(report.started_at)} • Completed{" "}
                                {formatDateTime(report.completed_at)}
                              </p>
                            </div>
                            <div className="inline-actions">
                              <Badge variant={quizType.variant}>{quizType.label}</Badge>
                              <Badge variant={quizStatus.variant}>{quizStatus.label}</Badge>
                              {report.required_pass_percentage ? (
                                <Badge variant="info">Pass {report.required_pass_percentage}%</Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="analytics-report-summary">
                            <div>
                              <span>
                                {report.session_type === "topic_assessment" ? "Score" : "Accuracy"}
                              </span>
                              <strong>
                                {report.session_type === "topic_assessment"
                                  ? formatScorePercent(report.score_percent)
                                  : formatAccuracy(report.accuracy)}
                              </strong>
                            </div>
                            <div>
                              <span>First Try</span>
                              <strong>
                                {report.correct_count}/{report.total_questions}
                              </strong>
                            </div>
                            <div>
                              <span>Topics Covered</span>
                              <strong>{report.topics.length}</strong>
                            </div>
                          </div>

                          {report.topics.length ? (
                            <div className="analytics-report-topics">
                              {report.topics.map((topic) => (
                                <div
                                  key={`${report.session_id}-${topic.concept_id}`}
                                  className="analytics-report-topic"
                                >
                                  <div>
                                    <p>{topic.concept_name}</p>
                                    <span>
                                      {topic.correct_count}/{topic.total_questions} first try
                                    </span>
                                  </div>
                                  <Badge variant="neutral">{formatAccuracy(topic.accuracy)}</Badge>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {report.recommendations.length ? (
                            <ul className="analytics-note-list">
                              {report.recommendations.map((item, index) => (
                                <li key={`${report.session_id}-rec-${index}`}>{item}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No test reports yet"
                    description="Quiz reports will appear once the student starts and completes tests."
                  />
                )}
              </Card>
            </div>

            <div className="stack">
              <Card className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Bookmarks</h3>
                    <p className="muted">Topics the student flagged for fast revision.</p>
                  </div>
                </div>
                {activity.bookmarks.length ? (
                  <div className="analytics-simple-list">
                    {activity.bookmarks.map((bookmark) => (
                      <div key={bookmark.concept_id} className="analytics-simple-item">
                        <div>
                          <h4>{bookmark.concept_name}</h4>
                          <p className="muted">Saved {formatDateTime(bookmark.created_at)}</p>
                        </div>
                        <Badge variant="info">Bookmarked</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No bookmarks yet"
                    description="Bookmarks will appear here when the student saves topics."
                  />
                )}
              </Card>

              <Card className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Learning Assistant Usage</h3>
                    <p className="muted">Conversation activity across individual topics.</p>
                  </div>
                </div>
                {activity.learning_sessions.length ? (
                  <div className="analytics-simple-list">
                    {activity.learning_sessions.map((session) => (
                      <div key={session.session_id} className="analytics-simple-item">
                        <div>
                          <h4>{session.concept_name}</h4>
                          <p className="muted">
                            {session.prompt_count} prompt(s) • {session.message_count} total messages
                          </p>
                          <p className="muted">
                            Last interaction {formatDateTime(session.last_message_at)}
                          </p>
                        </div>
                        <Badge variant={session.status === "active" ? "success" : "neutral"}>
                          {session.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No assistant usage yet"
                    description="Learning assistant conversations will appear once the student asks questions."
                  />
                )}
              </Card>

              <Card className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Recent Activity</h3>
                    <p className="muted">A compact timeline of the latest course actions.</p>
                  </div>
                </div>
                {activity.recent_activity.length ? (
                  <div className="analytics-timeline">
                    {activity.recent_activity.map((event, index) => (
                      <div
                        key={`${event.event_type}-${event.occurred_at}-${index}`}
                        className="analytics-timeline-item"
                      >
                        <div className="analytics-timeline-dot" />
                        <div>
                          <h4>{event.title}</h4>
                          {event.description ? <p>{event.description}</p> : null}
                          <p className="muted">{formatDateTime(event.occurred_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No recent events"
                    description="Activity events will show here after the student starts engaging."
                  />
                )}
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
};
