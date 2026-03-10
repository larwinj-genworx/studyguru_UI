import { api } from "@/lib/axios";
import type {
  QuizAnswerRequest,
  QuizAnswerResponse,
  QuizReportResponse,
  QuizSessionStartRequest,
  QuizSessionStartResponse,
  TopicAssessmentStartRequest
} from "@/features/quiz/types";

const BASE_PATH = "/v1/quizzes";

export const startQuizSession = async (
  payload: QuizSessionStartRequest
): Promise<QuizSessionStartResponse> => {
  const response = await api.post(`${BASE_PATH}/student/sessions`, payload);
  return response.data;
};

export const startTopicAssessment = async (
  payload: TopicAssessmentStartRequest
): Promise<QuizSessionStartResponse> => {
  const response = await api.post(`${BASE_PATH}/student/assessments`, payload);
  return response.data;
};

export const getQuizSession = async (sessionId: string): Promise<QuizSessionStartResponse> => {
  const response = await api.get(`${BASE_PATH}/student/sessions/${sessionId}`);
  return response.data;
};

export const submitQuizAnswer = async (
  sessionId: string,
  payload: QuizAnswerRequest
): Promise<QuizAnswerResponse> => {
  const response = await api.post(`${BASE_PATH}/student/sessions/${sessionId}/answer`, payload);
  return response.data;
};

export const getQuizReport = async (sessionId: string): Promise<QuizReportResponse> => {
  const response = await api.get(`${BASE_PATH}/student/sessions/${sessionId}/report`);
  return response.data;
};
