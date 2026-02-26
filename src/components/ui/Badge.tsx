import React from "react";

type BadgeVariant = "neutral" | "success" | "warning" | "info" | "danger";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = "neutral", children }) => {
  return <span className={`badge ${variant}`.trim()}>{children}</span>;
};
