import React from "react";

import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import type { MaterialJobStatusResponse } from "@/features/study_material/types";

interface JobProgressProps {
  job: MaterialJobStatusResponse;
}

export const JobProgress: React.FC<JobProgressProps> = ({ job }) => {
  const statusBadge = job.status === "completed" ? "success" : job.status === "failed" ? "danger" : "info";

  return (
    <div className="card subtle">
      <div className="job-header">
        <div>
          <p className="muted">Generation Job</p>
          <h4>{job.job_id}</h4>
        </div>
        <Badge variant={statusBadge}>{job.status}</Badge>
      </div>
      <Progress value={job.progress} label="Generation progress" />
      <div className="status-grid">
        {Object.entries(job.concept_statuses).map(([conceptId, status]) => (
          <div key={conceptId} className="status-item">
            <span className="status-dot" />
            <div>
              <p className="status-title">{conceptId.slice(0, 8)}</p>
              <p className="status-subtitle">{status}</p>
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
