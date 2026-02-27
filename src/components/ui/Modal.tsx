import React from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
  footer,
  headerActions,
  className = "",
  bodyClassName = ""
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={`modal ${className}`.trim()}>
        <div className="modal-header">
          <div className="modal-title">
            <h3>{title}</h3>
          </div>
          <div className="modal-actions">
            {headerActions}
            <button className="icon-button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>
        <div className={`modal-body ${bodyClassName}`.trim()}>{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
};
