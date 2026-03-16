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
  AdminStudentConceptActivityResponse,
  AdminStudentQuizReportResponse,
  StudentActivityEventResponse
} from "@/features/study_material/types";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium"
});

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }
  return dateTimeFormatter.format(date);
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }
  return dateFormatter.format(date);
};

const formatDateTimeOr = (value?: string | null, fallback = "Not available") => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return dateTimeFormatter.format(date);
};

const formatDateOr = (value?: string | null, fallback = "Not available") => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return dateFormatter.format(date);
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

const formatGradeLevel = (value?: string | null) => {
  if (!value) {
    return "Not assigned";
  }
  return value.replace(/\s+/g, " ").trim();
};

const getReportTitle = (report: AdminStudentQuizReportResponse) => {
  return report.session_type === "topic_assessment"
    ? "Topic Assessment Report"
    : "Practice Quiz Report";
};

const getReportContext = (report: AdminStudentQuizReportResponse) => {
  if (report.topics.length === 1) {
    return report.topics[0].concept_name;
  }
  if (report.topics.length > 1) {
    return `${report.topics.length} topics covered`;
  }
  return report.session_type === "topic_assessment"
    ? "Formal topic mastery checkpoint"
    : "Independent revision attempt";
};

const getReportOutcome = (report: AdminStudentQuizReportResponse) => {
  if (report.session_type === "topic_assessment") {
    if (report.passed === true) {
      return {
        tone: "success",
        title: "Pass threshold met",
        detail: report.required_pass_percentage
          ? `Student achieved the required ${report.required_pass_percentage}% benchmark.`
          : "Student completed the assessment successfully."
      };
    }
    if (report.passed === false) {
      return {
        tone: "warning",
        title: "Follow-up attempt required",
        detail: report.required_pass_percentage
          ? `A ${report.required_pass_percentage}% pass mark is still pending.`
          : "Another assessment attempt is recommended."
      };
    }
    return {
      tone: "info",
      title: "Assessment in progress",
      detail: "The assessment session has started but does not have a final outcome yet."
    };
  }

  if (report.status === "completed") {
    return {
      tone: "neutral",
      title: "Practice session completed",
      detail: "Use the topic breakdown below to identify strengths and revision areas."
    };
  }

  return {
    tone: "info",
    title: "Practice session still open",
    detail: "Results may change if the student returns to finish the quiz."
  };
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

  const orderedQuizReports = useMemo(() => {
    if (!activity) {
      return [];
    }
    return [...activity.quiz_reports].sort(
      (left, right) =>
        new Date(right.started_at).getTime() - new Date(left.started_at).getTime()
    );
  }, [activity]);

  const orderedRecentActivity = useMemo(() => {
    if (!activity) {
      return [];
    }
    return [...activity.recent_activity].sort(
      (left: StudentActivityEventResponse, right: StudentActivityEventResponse) =>
        new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime()
    );
  }, [activity]);

  const orderedBookmarks = useMemo(() => {
    if (!activity) {
      return [];
    }
    return [...activity.bookmarks].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  }, [activity]);

  const orderedLearningSessions = useMemo(() => {
    if (!activity) {
      return [];
    }
    return [...activity.learning_sessions].sort(
      (left, right) =>
        new Date(right.last_message_at).getTime() - new Date(left.last_message_at).getTime()
    );
  }, [activity]);

  const profileDetails = useMemo(() => {
    if (!activity) {
      return [];
    }
    return [
      { label: "Student Email", value: activity.student_email },
      { label: "Student ID", value: activity.student_id, mono: true },
      { label: "Subject", value: activity.subject_name },
      { label: "Grade", value: formatGradeLevel(activity.grade_level) },
      { label: "Assigned On", value: formatDate(activity.enrolled_at) },
      {
        label: "Last Active",
        value: formatDateTimeOr(activity.overview.last_activity_at, "No activity recorded")
      }
    ];
  }, [activity]);

  const studentSignals = useMemo(() => {
    if (!activity) {
      return [];
    }
    return [
      {
        label: "Current Focus",
        value: activity.overview.current_topic_name ?? "Course completed",
        detail: activity.overview.current_topic_order
          ? `Working in Topic ${activity.overview.current_topic_order}`
          : "All topics are now unlocked"
      },
      {
        label: "Assessment Status",
        value: `${activity.overview.passed_assessments} passed`,
        detail: activity.overview.failed_assessments
          ? `${activity.overview.failed_assessments} topic assessment(s) need retry`
          : "No retry blockers at the moment"
      },
      {
        label: "Learning Support",
        value: `${activity.overview.learning_sessions} sessions`,
        detail: `${activity.overview.learning_messages} assistant messages recorded`
      }
    ];
  }, [activity]);

  const summaryStats = useMemo(() => {
    if (!activity) {
      return [];
    }
    return [
      {
        label: "Progress",
        value: `${activity.overview.progress_percent}%`,
        detail: `${activity.overview.completed_topics}/${activity.overview.total_concepts} topics passed`
      },
      {
        label: "Average Accuracy",
        value: formatAccuracy(activity.overview.average_quiz_accuracy),
        detail: `Best ${formatAccuracy(activity.overview.best_quiz_accuracy)}`
      },
      {
        label: "Completed Quizzes",
        value: `${activity.overview.completed_quizzes}`,
        detail: `${activity.overview.total_quiz_sessions} total quiz sessions`
      },
      {
        label: "Passed Assessments",
        value: `${activity.overview.passed_assessments}`,
        detail: activity.overview.failed_assessments
          ? `${activity.overview.failed_assessments} retry pending`
          : "All completed assessments are clear"
      },
      {
        label: "Bookmarks",
        value: `${activity.overview.bookmarks_count}`,
        detail: "Saved revision markers"
      }
    ];
  }, [activity]);

  return (
    <DashboardLayout
      title="Student Activity"
      subtitle="Review ordered progression, learning behaviour, and assessment outcomes."
      showHeader={false}
    >
      <PageHeader
        title="Student Activity"
        subtitle="Admin view of topic progress, test performance, and learning support activity."
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
          <Card className="panel admin-student-summary-card">
            <div className="admin-student-summary-head">
              <div>
                <p className="eyebrow">Student Profile</p>
                <h2>{activity.student_email}</h2>
                <p className="admin-student-summary-subtitle">
                  {activity.subject_name} • {formatGradeLevel(activity.grade_level)}
                </p>
              </div>
              <div className="admin-student-summary-badges">
                <Badge variant={activity.overview.failed_assessments ? "warning" : "success"}>
                  {activity.overview.failed_assessments ? "Needs Review" : "On Track"}
                </Badge>
                <Badge variant={activity.overview.current_topic_order ? "info" : "success"}>
                  {activity.overview.current_topic_order
                    ? `Topic ${activity.overview.current_topic_order}`
                    : "Course Complete"}
                </Badge>
              </div>
            </div>

            <div className="admin-student-summary-grid">
              <div className="admin-student-profile-grid">
                {profileDetails.map((detail) => (
                  <div key={detail.label} className="admin-student-detail">
                    <span>{detail.label}</span>
                    <strong className={detail.mono ? "admin-student-mono" : ""}>
                      {detail.value}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="admin-student-signal-list">
                {studentSignals.map((signal) => (
                  <div key={signal.label} className="admin-student-signal">
                    <span>{signal.label}</span>
                    <strong>{signal.value}</strong>
                    <p>{signal.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="admin-student-metric-row">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="analytics-stat-card compact">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.detail}</p>
              </div>
            ))}
          </div>

          <div className="admin-student-activity-shell">
            <div className="admin-student-main-column">
              <Card className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Topic Progress</h3>
                    <p className="muted">
                      Ordered progression with pass requirements, scores, and current blockers.
                    </p>
                  </div>
                </div>
                {orderedConceptActivity.length ? (
                  <div className="analytics-topic-list">
                    {orderedConceptActivity.map((concept) => {
                      const statusMeta = getConceptStatusMeta(concept.status);
                      const progressMeta = getProgressStateMeta(concept.progress_state);
                      return (
                        <article
                          key={concept.concept_id}
                          className={`analytics-topic-row ${statusMeta.tone}`}
                        >
                          <div className="analytics-topic-row-head">
                            <div className="analytics-topic-title">
                              <span className="analytics-topic-order">Topic {concept.topic_order}</span>
                              <h4>{concept.concept_name}</h4>
                            </div>
                            <div className="analytics-topic-badges">
                              <Badge variant={progressMeta.variant}>{progressMeta.label}</Badge>
                              {concept.is_current ? <Badge variant="info">Current</Badge> : null}
                              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                            </div>
                          </div>

                          <div className="analytics-topic-row-metrics">
                            <div className="analytics-inline-metric">
                              <span>Pass Mark</span>
                              <strong>{concept.pass_percentage}%</strong>
                            </div>
                            <div className="analytics-inline-metric">
                              <span>Attempts</span>
                              <strong>{concept.assessment_attempts}</strong>
                            </div>
                            <div className="analytics-inline-metric">
                              <span>Latest Score</span>
                              <strong>{formatScorePercent(concept.latest_score_percent)}</strong>
                            </div>
                            <div className="analytics-inline-metric">
                              <span>Best Score</span>
                              <strong>{formatScorePercent(concept.best_score_percent)}</strong>
                            </div>
                            <div className="analytics-inline-metric">
                              <span>Last Activity</span>
                              <strong>{formatDateTimeOr(concept.last_activity_at, "No activity")}</strong>
                            </div>
                          </div>

                          <div className="analytics-topic-row-footer">
                            <p>
                              {concept.passed_at
                                ? `Passed on ${formatDateTime(concept.passed_at)}`
                                : concept.learning_completed_at
                                  ? `Learning completed on ${formatDateTime(concept.learning_completed_at)}`
                                  : concept.has_bookmark
                                    ? "Bookmarked for revision"
                                    : "No bookmark yet"}
                            </p>
                            <p>
                              {concept.blocker_message || `${concept.learning_sessions} bot session(s)`}
                            </p>
                          </div>
                        </article>
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
                      Assessment and practice history with score summaries and follow-up guidance.
                    </p>
                  </div>
                </div>
                {orderedQuizReports.length ? (
                  <div className="analytics-report-list compact">
                    {orderedQuizReports.map((report) => {
                      const quizStatus = getQuizStatusMeta(report.status);
                      const quizType = getQuizTypeMeta(report.session_type, report.passed);
                      const outcome = getReportOutcome(report);
                      return (
                        <div
                          key={report.session_id}
                          className={`analytics-report-card ${report.session_type === "topic_assessment" ? "assessment" : "practice"}`}
                        >
                          <div className="analytics-report-topline">
                            <div className="analytics-report-heading">
                              <p className="eyebrow">
                                {report.session_type === "topic_assessment"
                                  ? "Assessment Summary"
                                  : "Practice Summary"}
                              </p>
                              <h4>{getReportTitle(report)}</h4>
                              <p className="muted">{getReportContext(report)}</p>
                            </div>
                            <div className="analytics-report-badges">
                              <Badge variant={quizType.variant}>{quizType.label}</Badge>
                              <Badge variant={quizStatus.variant}>{quizStatus.label}</Badge>
                              {report.required_pass_percentage ? (
                                <Badge variant="info">Pass {report.required_pass_percentage}%</Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="analytics-report-dates">
                            <span>Started {formatDateTime(report.started_at)}</span>
                            <span>
                              Completed {formatDateTimeOr(report.completed_at, "In progress")}
                            </span>
                          </div>

                          <div className={`analytics-report-outcome ${outcome.tone}`}>
                            <strong>{outcome.title}</strong>
                            <p>{outcome.detail}</p>
                          </div>

                          <div className="analytics-report-stats-row">
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
                              <span>Correct Answers</span>
                              <strong>
                                {report.correct_count}/{report.total_questions}
                              </strong>
                            </div>
                            <div>
                              <span>Topics Covered</span>
                              <strong>{report.topics.length}</strong>
                            </div>
                            <div>
                              <span>Completed On</span>
                              <strong>{formatDateOr(report.completed_at, "Pending")}</strong>
                            </div>
                          </div>

                          {report.topics.length ? (
                            <div className="analytics-report-topics compact">
                              <div className="analytics-report-section-title">
                                <h5>Topic Breakdown</h5>
                                <p className="muted">
                                  Performance across the topics included in this report.
                                </p>
                              </div>
                              {report.topics.map((topic) => (
                                <div
                                  key={`${report.session_id}-${topic.concept_id}`}
                                  className="analytics-report-topic"
                                >
                                  <div>
                                    <p>{topic.concept_name}</p>
                                    <span>
                                      {topic.correct_count}/{topic.total_questions} correct answers
                                    </span>
                                  </div>
                                  <Badge variant="neutral">{formatAccuracy(topic.accuracy)}</Badge>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {report.recommendations.length ? (
                            <div className="analytics-report-recommendations">
                              <div className="analytics-report-section-title">
                                <h5>Recommended Follow-up</h5>
                                <p className="muted">
                                  Suggested actions based on the student&apos;s test outcome.
                                </p>
                              </div>
                              <ul className="analytics-note-list">
                                {report.recommendations.map((item, index) => (
                                  <li key={`${report.session_id}-rec-${index}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
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

            <div className="admin-student-side-column">
              <Card className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Study Support</h3>
                    <p className="muted">
                      Quick view of bookmarks and learning assistant usage for this student.
                    </p>
                  </div>
                </div>
                <div className="admin-student-side-section">
                  <div className="admin-student-side-section-header">
                    <h4>Bookmarks</h4>
                    {orderedBookmarks.length ? (
                      <Badge variant="info">{orderedBookmarks.length}</Badge>
                    ) : null}
                  </div>
                  {orderedBookmarks.length ? (
                    <div className="analytics-simple-list compact">
                      {orderedBookmarks.map((bookmark) => (
                        <div key={bookmark.concept_id} className="analytics-simple-item compact">
                          <div>
                            <h4>{bookmark.concept_name}</h4>
                            <p className="muted">Saved {formatDateTime(bookmark.created_at)}</p>
                          </div>
                          <Badge variant="info">Saved</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No bookmarks yet"
                      description="Bookmarks will appear here when the student saves topics."
                    />
                  )}
                </div>

                <div className="admin-student-side-divider" />

                <div className="admin-student-side-section">
                  <div className="admin-student-side-section-header">
                    <h4>Learning Assistant</h4>
                    {orderedLearningSessions.length ? (
                      <Badge variant="neutral">{orderedLearningSessions.length}</Badge>
                    ) : null}
                  </div>
                  {orderedLearningSessions.length ? (
                    <div className="analytics-simple-list compact">
                      {orderedLearningSessions.map((session) => (
                        <div key={session.session_id} className="analytics-simple-item compact">
                          <div>
                            <h4>{session.concept_name}</h4>
                            <p className="muted">
                              {session.prompt_count} prompt(s) • {session.message_count} messages
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
                </div>
              </Card>

              <Card className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Recent Activity</h3>
                    <p className="muted">A compact timeline of the latest course actions.</p>
                  </div>
                </div>
                {orderedRecentActivity.length ? (
                  <div className="analytics-timeline">
                    {orderedRecentActivity.map((event, index) => (
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
