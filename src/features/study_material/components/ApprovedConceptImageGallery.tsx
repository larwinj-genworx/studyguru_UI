import React, { useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import {
  fetchStudentConceptImageBlob,
  getStudentConceptImages
} from "@/features/study_material/services/studyMaterialService";
import type { ConceptImageAssetResponse } from "@/features/study_material/types";

interface ApprovedConceptImageGalleryProps {
  subjectId: string;
  conceptId: string;
  conceptName: string;
}

export const ApprovedConceptImageGallery: React.FC<ApprovedConceptImageGalleryProps> = ({
  subjectId,
  conceptId,
  conceptName
}) => {
  const [images, setImages] = useState<ConceptImageAssetResponse[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    url: string;
    caption?: string | null;
    explanation?: string | null;
    learningPoints: string[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getStudentConceptImages(subjectId, conceptId);
        if (!cancelled) {
          setImages(response.images || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.detail || "Failed to load concept visuals.");
        }
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
  }, [subjectId, conceptId]);

  useEffect(() => {
    if (!images.length) {
      setThumbUrls((prev) => {
        Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
        return {};
      });
      return;
    }
    let cancelled = false;
    const previous = thumbUrls;
    const load = async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        images.map(async (image) => {
          try {
            const blob = await fetchStudentConceptImageBlob(subjectId, conceptId, image.image_id, "thumb");
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
      Object.values(previous).forEach((url) => URL.revokeObjectURL(url));
      setThumbUrls(next);
    };
    load();
    return () => {
      cancelled = true;
      Object.values(previous).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images, subjectId, conceptId]);

  useEffect(() => {
    return () => {
      Object.values(thumbUrls).forEach((url) => URL.revokeObjectURL(url));
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [thumbUrls, preview]);

  const handleOpenPreview = async (image: ConceptImageAssetResponse) => {
    try {
      const blob = await fetchStudentConceptImageBlob(subjectId, conceptId, image.image_id, "full");
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
      setError(err?.response?.data?.detail || "Failed to open image.");
    }
  };

  const handleClosePreview = () => {
    if (preview?.url) {
      URL.revokeObjectURL(preview.url);
    }
    setPreview(null);
  };

  if (loading) {
    return (
      <section className="learning-image-section">
        <div className="flashcard-loading">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="learning-image-section">
        <div className="alert danger">{error}</div>
      </section>
    );
  }

  if (!images.length) {
    return null;
  }

  return (
    <>
      <section className="learning-image-section">
        <div className="learning-image-head">
          <div>
            <p className="eyebrow">Visual Learning</p>
            <h2>{conceptName} through study visuals</h2>
            <p className="muted">
              Approved concept boards designed to make the idea easier to grasp and revise.
            </p>
          </div>
        </div>
        <div className="learning-image-grid">
          {images.map((image) => (
            <button
              key={image.image_id}
              type="button"
              className="learning-image-card"
              onClick={() => void handleOpenPreview(image)}
            >
              {thumbUrls[image.image_id] ? (
                <img src={thumbUrls[image.image_id]} alt={image.alt_text || image.title} />
              ) : (
                <div className="concept-image-placeholder">Image unavailable</div>
              )}
              <div className="learning-image-copy">
                <div className="learning-image-badges">
                  {image.visual_style ? <span>{image.visual_style.replace(/_/g, " ")}</span> : null}
                  {image.complexity_level ? <span>{image.complexity_level}</span> : null}
                </div>
                <h4>{image.title}</h4>
                {image.explanation ? <p>{image.explanation}</p> : image.caption ? <p>{image.caption}</p> : null}
                {image.learning_points?.length ? (
                  <ul className="learning-image-points">
                    {image.learning_points.slice(0, 2).map((point, index) => (
                      <li key={`${image.image_id}-point-${index}`}>{point}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </section>

      <Modal
        open={Boolean(preview)}
        title={preview?.title || "Visual Learning"}
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
