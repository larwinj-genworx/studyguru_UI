import React from "react";

interface ProgressProps {
  value: number;
  label?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, label }) => {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="progress">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <div className="progress-meta">
        <span>{label ?? "Progress"}</span>
        <span>{clamped}%</span>
      </div>
    </div>
  );
};
