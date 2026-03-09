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

export interface LearningSection {
  id: string;
  title: string;
  level: number;
  blocks: LearningBlock[];
  children?: LearningSection[];
}

export type LearningBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; style: "bullet" | "number"; items: string[] }
  | {
      type: "formula";
      title?: string;
      formula: string;
      variables?: { symbol: string; meaning: string }[];
      explanation?: string;
      example?: string;
    }
  | { type: "code"; language?: string; code: string }
  | {
      type: "callout";
      variant: "note" | "warning" | "example" | "takeaway" | "highlight";
      title?: string;
      content: string[] | string;
    }
  | {
      type: "example";
      title?: string;
      steps?: string[];
      result?: string;
    };

export interface LearningContent {
  metadata: Record<string, any>;
  highlights: string[];
  sections: LearningSection[];
}

export interface LearningContentResponse {
  concept_id: string;
  concept_name: string;
  subject_id: string;
  subject_name: string;
  grade_level: string;
  lifecycle_status: "draft" | "approved" | "published" | "unavailable";
  version: number;
  generated_at: string;
  approved_at?: string | null;
  published_at?: string | null;
  content_schema_version?: string | null;
  content: LearningContent;
}

export interface LearningBotCitation {
  source_id: string;
  label: string;
  source_type: string;
  url?: string | null;
  section_id?: string | null;
  note?: string | null;
}

export interface LearningBotMessageResponse {
  message_id: string;
  role: "user" | "assistant";
  content: string;
  citations: LearningBotCitation[];
  follow_up_suggestions: string[];
  meta: Record<string, any>;
  created_at: string;
}

export interface LearningBotSessionResponse {
  session_id: string;
  subject_id: string;
  subject_name: string;
  concept_id: string;
  concept_name: string;
  grade_level: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface LearningBotSessionDetailResponse {
  session: LearningBotSessionResponse;
  messages: LearningBotMessageResponse[];
  suggested_prompts: string[];
}

export interface LearningBotTurnResponse {
  session: LearningBotSessionResponse;
  user_message: LearningBotMessageResponse;
  assistant_message: LearningBotMessageResponse;
}

export type ConceptImageStatus = "pending" | "approved" | "rejected";

export interface ConceptImageAssetResponse {
  image_id: string;
  status: ConceptImageStatus;
  title: string;
  caption?: string | null;
  alt_text?: string | null;
  intent_label?: string | null;
  source_page_url?: string | null;
  source_image_url?: string | null;
  source_domain?: string | null;
  width?: number | null;
  height?: number | null;
  mime_type?: string | null;
  relevance_score: number;
  created_at: string;
  approved_at?: string | null;
}

export interface ConceptImageCollectionResponse {
  subject_id: string;
  subject_name: string;
  concept_id: string;
  concept_name: string;
  material_version: number;
  images: ConceptImageAssetResponse[];
}

export interface ConceptBookmarkResponse {
  concept_id: string;
  concept_name: string;
  subject_id: string;
  subject_name: string;
  created_at: string;
}

export interface ConceptResourcesResponse {
  concept_id: string;
  concept_name: string;
  subject_id: string;
  subject_name: string;
  resources: ResourceItem[];
  approved_video_id?: string | null;
}

export interface ArtifactIndex {
  pdf?: string | null;
  quick_revision_pdf?: string | null;
  quiz_json?: string | null;
  flashcards_json?: string | null;
  resources_json?: string | null;
  zip?: string | null;
  extras?: Record<string, string>;
}

export interface ResourceItem {
  title: string;
  url: string;
  note?: string;
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

export interface AdminMaterialPublishRequest {
  concept_ids: string[];
}
