import React, { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextArea";
import {
  approveAdminConceptImage,
  fetchAdminConceptImageBlob,
  generateAdminConceptImages,
  getAdminConceptImages,
  rejectAdminConceptImage
} from "@/features/study_material/services/studyMaterialService";
import type {
  ConceptImageAssetResponse,
  ConceptImageCollectionResponse
} from "@/features/study_material/types";

interface ConceptImageReviewModalProps {
  open: boolean;
  subjectId: string;
  conceptId: string;
  conceptName: string;
  onClose: () => void;
}

export const ConceptImageReviewModal: React.FC<ConceptImageReviewModalProps> = ({
  open,
  subjectId,
  conceptId,
  conceptName,
  onClose
}) => {
  const [collection, setCollection] = useState<ConceptImageCollectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    variant: "success" | "info";
    text: string;
  } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<{
    title: string;
    url: string;
    caption?: string | null;
    explanation?: string | null;
    learningPoints: string[];
  } | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setFeedback(null);
      try {
        const response = await getAdminConceptImages(subjectId, conceptId);
        if (cancelled) {
          return;
        }
        setCollection(response);
        setPrompt(response.prompt_text || "");
      } catch (err: any) {
        if (cancelled) {
          return;
        }
        setError(err?.response?.data?.detail || "Failed to load concept visuals.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, subjectId, conceptId]);

  useEffect(() => {
    const images = collection?.images || [];
    if (!images.length) {
      setThumbUrls((prev) => {
        Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
        return {};
      });
      return;
    }
    let cancelled = false;
    const previousUrls = thumbUrls;
    const loadThumbs = async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        images.map(async (image) => {
          try {
            const blob = await fetchAdminConceptImageBlob(subjectId, conceptId, image.image_id, "thumb");
            next[image.image_id] = URL.createObjectURL(blob);
          } catch {
            return;
          }
        })
      );
      if (cancelled) {
        Object.values(next).forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      Object.values(previousUrls).forEach((url) => URL.revokeObjectURL(url));
      setThumbUrls(next);
    };
    loadThumbs();
    return () => {
      cancelled = true;
      Object.values(previousUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [collection, subjectId, conceptId]);

  useEffect(() => {
    if (!open && preview?.url) {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
  }, [open, preview]);

  useEffect(() => {
    return () => {
      Object.values(thumbUrls).forEach((url) => URL.revokeObjectURL(url));
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [thumbUrls, preview]);

  const counts = useMemo(() => {
    const images = collection?.images || [];
    return {
      approved: images.filter((item) => item.status === "approved").length,
      pending: images.filter((item) => item.status === "pending").length,
      rejected: images.filter((item) => item.status === "rejected").length
    };
  }, [collection]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await generateAdminConceptImages(subjectId, conceptId, {
        prompt,
        refresh: true
      });
      setCollection(response);
      setFeedback({
        variant: "info",
        text: response.images.length
          ? `Generated ${response.images.length} concept visual(s). Review and approve the best one.`
          : "Generation completed, but no concept visuals were produced."
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to generate concept visuals.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (imageId: string) => {
    setActionLoadingId(imageId);
    setError(null);
    setFeedback(null);
    const imageTitle =
      collection?.images.find((item) => item.image_id === imageId)?.title || "Selected image";
    try {
      const response = await approveAdminConceptImage(subjectId, conceptId, imageId);
      setCollection(response);
      setFeedback({
        variant: "success",
        text: `${imageTitle} was approved successfully and is now available in the learning page visuals.`
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to approve image.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (imageId: string) => {
    setActionLoadingId(imageId);
    setError(null);
    setFeedback(null);
    const imageTitle =
      collection?.images.find((item) => item.image_id === imageId)?.title || "Selected image";
    try {
      const response = await rejectAdminConceptImage(subjectId, conceptId, imageId);
      setCollection(response);
      setFeedback({
        variant: "info",
        text: `${imageTitle} was marked as rejected.`
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to reject image.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenPreview = async (image: ConceptImageAssetResponse) => {
    try {
      const blob = await fetchAdminConceptImageBlob(subjectId, conceptId, image.image_id, "full");
      const url = URL.createObjectURL(blob);
      setPreview((prev) => {
        if (prev?.url) {
          URL.revokeObjectURL(prev.url);
        }
        return {
          title: image.title,
          url,
          caption: image.caption,
          explanation: image.explanation,
          learningPoints: image.learning_points || []
        };
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to open image preview.");
    }
  };

  const handleClosePreview = () => {
    if (preview?.url) {
      URL.revokeObjectURL(preview.url);
    }
    setPreview(null);
  };

  return (
    <>
      <Modal
        open={open}
        title={`Concept Visual Studio - ${conceptName}`}
        onClose={onClose}
        className="viewer-modal"
        bodyClassName="viewer-body"
        footer={
          <div className="inline-actions">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button variant="secondary" onClick={handleGenerate} disabled={loading}>
              {collection?.images.length ? "Regenerate Visuals" : "Generate Visuals"}
            </Button>
          </div>
        }
      >
        <div className="concept-visual-brief">
          <div className="concept-visual-brief-copy">
            <p className="eyebrow">Admin Visual Brief</p>
            <h4>Guide the renderer toward the most helpful study angle.</h4>
            <p className="muted">
              The engine uses concept complexity, learning content, and this admin prompt together.
            </p>
          </div>
          <TextArea
            label="Focus Prompt"
            hint="Example: Emphasize the stages clearly and show the order students should remember."
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <div className="concept-visual-badges">
            {collection?.focus_area ? <span>{collection.focus_area}</span> : null}
            {collection?.complexity_level ? <span>{collection.complexity_level}</span> : null}
            <span>CPU-friendly local generation</span>
          </div>
        </div>

        <div className="image-review-head">
          <div className="image-review-stat">
            <span>Approved</span>
            <strong>{counts.approved}</strong>
          </div>
          <div className="image-review-stat">
            <span>Pending</span>
            <strong>{counts.pending}</strong>
          </div>
          <div className="image-review-stat">
            <span>Rejected</span>
            <strong>{counts.rejected}</strong>
          </div>
        </div>
        {feedback ? (
          <div className={`alert ${feedback.variant}`} role="status" aria-live="polite">
            {feedback.text}
          </div>
        ) : null}
        {loading ? (
          <div className="flashcard-loading">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="alert danger">{error}</div>
        ) : collection?.images.length ? (
          <div className="concept-image-grid">
            {collection.images.map((image) => (
              <article key={image.image_id} className={`concept-image-card ${image.status}`}>
                <button
                  type="button"
                  className="concept-image-preview"
                  onClick={() => void handleOpenPreview(image)}
                >
                  {thumbUrls[image.image_id] ? (
                    <img src={thumbUrls[image.image_id]} alt={image.alt_text || image.title} />
                  ) : (
                    <div className="concept-image-placeholder">Preview unavailable</div>
                  )}
                </button>
                <div className="concept-image-copy">
                  <div className="concept-image-topline">
                    <span className={`badge ${image.status === "approved" ? "success" : image.status === "rejected" ? "danger" : "warning"}`}>
                      {image.status}
                    </span>
                    <span className="concept-image-score">Score {image.pedagogical_score.toFixed(2)}</span>
                  </div>
                  <h4>{image.title}</h4>
                  {image.caption ? <p className="muted">{image.caption}</p> : null}
                  {image.explanation ? <p className="concept-image-note">{image.explanation}</p> : null}
                  <div className="concept-image-meta">
                    {image.visual_style ? <span>{image.visual_style.replace(/_/g, " ")}</span> : null}
                    {image.focus_area ? <span>{image.focus_area}</span> : null}
                    {image.width && image.height ? <span>{image.width} x {image.height}</span> : null}
                  </div>
                  {image.learning_points?.length ? (
                    <ul className="concept-image-points">
                      {image.learning_points.slice(0, 3).map((point, index) => (
                        <li key={`${image.image_id}-point-${index}`}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="inline-actions">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleApprove(image.image_id)}
                    disabled={actionLoadingId === image.image_id}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleReject(image.image_id)}
                    disabled={actionLoadingId === image.image_id}
                  >
                    Reject
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No concept visuals yet"
            description="Enter a focus prompt and generate local study visuals for this concept."
          />
        )}
      </Modal>

      <Modal
        open={Boolean(preview)}
        title={preview?.title || "Visual Preview"}
        onClose={handleClosePreview}
        className="viewer-modal"
        bodyClassName="viewer-body"
      >
        {preview ? (
          <div className="concept-image-preview-modal">
            <img src={preview.url} alt={preview.title} />
            {preview.caption ? <p className="muted">{preview.caption}</p> : null}
            {preview.explanation ? <p className="concept-image-note">{preview.explanation}</p> : null}
            {preview.learningPoints.length ? (
              <ul className="concept-image-points">
                {preview.learningPoints.map((point, index) => (
                  <li key={`${point}-${index}`}>{point}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
};
