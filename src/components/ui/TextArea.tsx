import React from "react";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, hint, className = "", ...props }) => {
  return (
    <label className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <textarea className={`textarea ${className}`.trim()} {...props} />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
};
