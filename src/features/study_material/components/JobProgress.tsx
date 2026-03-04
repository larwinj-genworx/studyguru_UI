import React from "react";

import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import type { MaterialJobStatusResponse } from "@/features/study_material/types";

interface JobProgressProps {
  job: MaterialJobStatusResponse;
  subjectName?: string;
  conceptNameMap?: Record<string, string>;
}

const formatStatus = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const JobProgress: React.FC<JobProgressProps> = ({
  job,
  subjectName,
  conceptNameMap
}) => {
  const statusBadge = job.status === "completed" ? "success" : job.status === "failed" ? "danger" : "info";
  const topicCount = job.concept_ids?.length ?? Object.keys(job.concept_statuses || {}).length;
  const title = subjectName ? `${subjectName} Generation` : "Generation Progress";

  return (
    <div className="card subtle">
      <div className="job-header">
        <div>
          <p className="muted">{title}</p>
          <h4>{job.status === "completed" ? "Materials Ready" : "Generating Materials"}</h4>
          {topicCount ? <p className="muted">{topicCount} topics in this run</p> : null}
        </div>
        <Badge variant={statusBadge}>{formatStatus(job.status)}</Badge>
      </div>
      <Progress value={job.progress} label="Generation progress" />
      <div className="status-grid">
        {Object.entries(job.concept_statuses).map(([conceptId, status], index) => (
          <div key={conceptId} className="status-item">
            <span className="status-dot" />
            <div>
              <p className="status-title">
                {conceptNameMap?.[conceptId] || `Topic ${index + 1}`}
              </p>
              <p className="status-subtitle">{formatStatus(status)}</p>
            </div>
          </div>
        ))}
      </div>
      {job.errors?.length ? (
        <div className="alert danger">{job.errors[job.errors.length - 1]}</div>
      ) : null}
    </div>
  );
};
