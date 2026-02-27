import React, { useEffect, useMemo } from "react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export type PreviewFileType = "pdf" | "video";

interface MaterialPreviewModalProps {
  open: boolean;
  title: string;
  fileName: string;
  fileType: PreviewFileType;
  previewBlob: Blob | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export const MaterialPreviewModal: React.FC<MaterialPreviewModalProps> = ({
  open,
  title,
  fileName,
  fileType,
  previewBlob,
  loading,
  error,
  onClose
}) => {
  const downloadUrl = useMemo(() => {
    if (!previewBlob) {
      return null;
    }
    return URL.createObjectURL(previewBlob);
  }, [previewBlob]);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const handleDownload = () => {
    if (!downloadUrl) {
      return;
    }
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      className="viewer-modal"
      bodyClassName="viewer-body"
      headerActions={
        downloadUrl ? (
          <Button size="sm" variant="secondary" onClick={handleDownload}>
            Download
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div className="viewer-loading">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="alert danger">{error}</div>
      ) : downloadUrl ? (
        <div className="material-viewer">
          {fileType === "video" ? (
            <video className="material-video" controls playsInline src={downloadUrl} />
          ) : (
            <iframe className="material-frame" src={downloadUrl} title={title} />
          )}
        </div>
      ) : (
        <p className="muted">Select a material to preview.</p>
      )}
    </Modal>
  );
};
