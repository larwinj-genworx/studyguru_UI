export interface QuizSessionStartRequest {
  subject_id: string;
  concept_ids: string[];
}

export interface QuizTopicSummary {
  concept_id: string;
  concept_name: string;
  weight: number;
  question_count: number;
  complexity_score?: number | null;
}

export interface QuizSessionResponse {
  session_id: string;
  subject_id: string;
  subject_name: string;
  status: "in_progress" | "completed" | "abandoned";
  total_questions: number;
  current_index: number;
  correct_count: number;
  incorrect_count: number;
  first_attempt_correct_count: number;
  started_at: string;
  completed_at?: string | null;
  topics: QuizTopicSummary[];
}

export interface QuizQuestionResponse {
  question_id: string;
  concept_id: string;
  concept_name: string;
  question: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard" | string;
  position: number;
  total: number;
}

export interface QuizSessionStartResponse {
  session: QuizSessionResponse;
  question: QuizQuestionResponse;
}

export interface QuizAnswerRequest {
  question_id: string;
  selected_option: string;
}

export interface QuizTopicPerformance {
  concept_id: string;
  concept_name: string;
  accuracy: number;
  correct_count: number;
  total_questions: number;
  status: string;
  recommendations: string[];
}

export interface QuizReportResponse {
  session_id: string;
  subject_id: string;
  subject_name: string;
  total_questions: number;
  correct_count: number;
  accuracy: number;
  completed_at: string;
  topic_breakdown: QuizTopicPerformance[];
  recommendations: string[];
  meta: Record<string, any>;
}

export interface QuizAnswerResponse {
  correct: boolean;
  hint?: string | null;
  hints_used: number;
  remaining_hints: number;
  session: QuizSessionResponse;
  next_question?: QuizQuestionResponse | null;
  completed: boolean;
  report?: QuizReportResponse | null;
}
