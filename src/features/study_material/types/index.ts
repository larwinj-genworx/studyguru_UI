export interface ConceptResponse {
  concept_id: string;
  name: string;
  description?: string | null;
  topic_order: number;
  pass_percentage: number;
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
  is_enrolled: boolean;
  enrolled_at?: string | null;
  created_at: string;
  updated_at: string;
  concepts: ConceptResponse[];
}

export interface ManagedStudentSubjectResponse {
  subject_id: string;
  name: string;
  published: boolean;
}

export interface AdminManagedStudentResponse {
  user_id: string;
  email: string;
  role: "student";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
  assigned_subjects: ManagedStudentSubjectResponse[];
}

export interface AdminManagedStudentCreateRequest {
  email: string;
  password: string;
}

export interface AdminManagedStudentUpdateRequest {
  password?: string;
  is_active?: boolean;
}

export type StudentTopicProgressState =
  | "locked"
  | "available"
  | "ready_for_assessment"
  | "retry_required"
  | "passed";

export interface StudentTopicProgressResponse {
  concept_id: string;
  name: string;
  description?: string | null;
  topic_order: number;
  pass_percentage: number;
  material_status: "unavailable" | "draft" | "approved" | "published";
  material_version: number;
  state: StudentTopicProgressState;
  is_current: boolean;
  is_locked: boolean;
  learning_completed_at?: string | null;
  passed_at?: string | null;
  latest_score_percent?: number | null;
  best_score_percent?: number | null;
  assessment_attempts: number;
  blocker_message?: string | null;
}

export interface StudentSubjectProgressResponse {
  subject_id: string;
  subject_name: string;
  grade_level: string;
  total_topics: number;
  completed_topics: number;
  progress_percent: number;
  current_concept_id?: string | null;
  current_concept_name?: string | null;
  topics: StudentTopicProgressResponse[];
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
      prompt?: string;
      steps?: string[];
      result?: string;
      example_style?: string;
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
  prompt_text?: string | null;
  focus_area?: string | null;
  complexity_level?: string | null;
  visual_style?: string | null;
  generator_name?: string | null;
  explanation?: string | null;
  learning_points: string[];
  width?: number | null;
  height?: number | null;
  mime_type?: string | null;
  pedagogical_score: number;
  created_at: string;
  approved_at?: string | null;
}

export interface ConceptImageCollectionResponse {
  subject_id: string;
  subject_name: string;
  concept_id: string;
  concept_name: string;
  material_version: number;
  prompt_text?: string | null;
  focus_area?: string | null;
  complexity_level?: string | null;
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

export interface StudentActivityOverviewResponse {
  total_concepts: number;
  engaged_concepts: number;
  completed_topics: number;
  progress_percent: number;
  current_topic_name?: string | null;
  current_topic_order?: number | null;
  failed_assessments: number;
  passed_assessments: number;
  bookmarks_count: number;
  total_quiz_sessions: number;
  completed_quizzes: number;
  average_quiz_accuracy?: number | null;
  best_quiz_accuracy?: number | null;
  learning_sessions: number;
  learning_messages: number;
  last_activity_at?: string | null;
}

export interface AdminEnrolledStudentResponse {
  student_id: string;
  student_email: string;
  enrolled_at: string;
  overview: StudentActivityOverviewResponse;
}

export interface AdminStudentConceptActivityResponse {
  concept_id: string;
  concept_name: string;
  topic_order: number;
  pass_percentage: number;
  status: "not_started" | "active" | "strong" | "needs_support" | string;
  progress_state?: StudentTopicProgressState | null;
  is_current: boolean;
  has_bookmark: boolean;
  learning_completed_at?: string | null;
  assessment_attempts: number;
  latest_score_percent?: number | null;
  best_score_percent?: number | null;
  passed_at?: string | null;
  blocker_message?: string | null;
  quiz_sessions: number;
  completed_quizzes: number;
  best_quiz_accuracy?: number | null;
  learning_sessions: number;
  learning_messages: number;
  last_activity_at?: string | null;
}

export interface AdminStudentQuizTopicResponse {
  concept_id: string;
  concept_name: string;
  accuracy: number;
  correct_count: number;
  total_questions: number;
  status: string;
  recommendations: string[];
}

export interface AdminStudentQuizReportResponse {
  session_id: string;
  session_type: "custom_practice" | "topic_assessment";
  status: "in_progress" | "completed" | "abandoned";
  started_at: string;
  completed_at?: string | null;
  accuracy?: number | null;
  score_percent?: number | null;
  correct_count: number;
  total_questions: number;
  required_pass_percentage?: number | null;
  passed?: boolean | null;
  topics: AdminStudentQuizTopicResponse[];
  recommendations: string[];
}

export interface AdminStudentLearningSessionResponse {
  session_id: string;
  concept_id: string;
  concept_name: string;
  status: "active" | "archived";
  title?: string | null;
  prompt_count: number;
  message_count: number;
  last_message_at: string;
}

export interface StudentActivityEventResponse {
  event_type: string;
  title: string;
  description?: string | null;
  occurred_at: string;
  concept_id?: string | null;
  concept_name?: string | null;
}

export interface AdminStudentActivityResponse {
  subject_id: string;
  subject_name: string;
  grade_level: string;
  student_id: string;
  student_email: string;
  enrolled_at: string;
  overview: StudentActivityOverviewResponse;
  concept_activity: AdminStudentConceptActivityResponse[];
  bookmarks: ConceptBookmarkResponse[];
  learning_sessions: AdminStudentLearningSessionResponse[];
  quiz_reports: AdminStudentQuizReportResponse[];
  recent_activity: StudentActivityEventResponse[];
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

export type FlashcardKind =
  | "core"
  | "intuition"
  | "step"
  | "formula"
  | "pitfall"
  | "summary"
  | "practice"
  | "concept";

export interface FlashcardItem {
  question: string;
  answer: string;
  hint?: string | null;
  kind?: FlashcardKind | null;
}

export interface AdminMaterialJobCreate {
  subject_id: string;
  concept_ids: string[];
  learner_profile?: string | null;
}

export interface ConceptCreate {
  name: string;
  description?: string | null;
  topic_order: number;
  pass_percentage: number;
}

export interface ConceptBulkCreate {
  concepts: ConceptCreate[];
}

export interface AdminConceptPlanItem {
  concept_id?: string;
  name: string;
  description?: string | null;
  pass_percentage: number;
}

export interface AdminConceptPlanUpdateRequest {
  concepts: AdminConceptPlanItem[];
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
