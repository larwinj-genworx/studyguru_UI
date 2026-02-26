export interface ConceptResponse {
  concept_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  material_status: "unavailable" | "draft" | "approved" | "published";
  material_version: number;
}

export interface SubjectResponse {
  subject_id: string;
  name: string;
  grade_level: string;
  description?: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  concepts: ConceptResponse[];
}

export interface ConceptMaterialResponse {
  concept_id: string;
  concept_name: string;
  lifecycle_status: "draft" | "approved" | "published" | "unavailable";
  version: number;
  source_job_id: string;
  artifact_index: ArtifactIndex;
  generated_at: string;
  approved_at?: string | null;
  published_at?: string | null;
}

export interface ArtifactIndex {
  pptx?: string | null;
  docx?: string | null;
  pdf?: string | null;
  quiz_json?: string | null;
  flashcards_json?: string | null;
  resources_json?: string | null;
  zip?: string | null;
}

export interface MaterialJobStatusResponse {
  job_id: string;
  subject_id: string;
  concept_ids: string[];
  status: "queued" | "running" | "completed" | "failed";
  review_status: "pending_review" | "approved";
  progress: number;
  concept_statuses: Record<string, string>;
  artifact_index: ArtifactIndex;
  concept_artifacts: Record<string, ArtifactIndex>;
  errors: string[];
  reviewer_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlashcardItem {
  question: string;
  answer: string;
}

export interface AdminMaterialJobCreate {
  subject_id: string;
  concept_ids: string[];
  learner_profile?: string | null;
}

export interface ConceptCreate {
  name: string;
  description?: string | null;
}

export interface ConceptBulkCreate {
  concepts: ConceptCreate[];
}

export interface SubjectCreate {
  name: string;
  grade_level: string;
  description?: string | null;
}

export interface AdminMaterialApproveRequest {
  concept_ids?: string[];
  approval_note?: string | null;
}
