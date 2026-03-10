import { api } from "@/lib/axios";
import type {
  AdminConceptPlanUpdateRequest,
  AdminMaterialApproveRequest,
  AdminMaterialJobCreate,
  AdminEnrolledStudentResponse,
  AdminStudentActivityResponse,
  AdminMaterialPublishRequest,
  FlashcardItem,
  ConceptBulkCreate,
  ConceptMaterialResponse,
  ConceptBookmarkResponse,
  ConceptImageCollectionResponse,
  ConceptResourcesResponse,
  LearningBotSessionDetailResponse,
  LearningBotTurnResponse,
  LearningContentResponse,
  MaterialJobStatusResponse,
  ResourceItem,
  StudentSubjectProgressResponse,
  StudentTopicProgressResponse,
  SubjectEnrollmentResponse,
  SubjectCreate,
  SubjectResponse
} from "@/features/study_material/types";

const BASE_PATH = "/v1/study-material";

export const createSubject = async (payload: SubjectCreate): Promise<SubjectResponse> => {
  const response = await api.post(`${BASE_PATH}/admin/subjects`, payload);
  return response.data;
};

export const addConceptsBulk = async (
  subjectId: string,
  payload: ConceptBulkCreate
): Promise<SubjectResponse> => {
  const response = await api.post(`${BASE_PATH}/admin/subjects/${subjectId}/concepts/bulk`, payload);
  return response.data;
};

export const saveAdminConceptPlan = async (
  subjectId: string,
  payload: AdminConceptPlanUpdateRequest
): Promise<SubjectResponse> => {
  const response = await api.put(`${BASE_PATH}/admin/subjects/${subjectId}/concept-plan`, payload);
  return response.data;
};

export const getSubject = async (subjectId: string): Promise<SubjectResponse> => {
  const response = await api.get(`${BASE_PATH}/admin/subjects/${subjectId}`);
  return response.data;
};

export const deleteSubject = async (subjectId: string, force?: boolean): Promise<void> => {
  const config = force ? { params: { force: true } } : undefined;
  await api.delete(`${BASE_PATH}/admin/subjects/${subjectId}`, config);
};

export const listAdminSubjectMaterials = async (
  subjectId: string
): Promise<ConceptMaterialResponse[]> => {
  const response = await api.get(`${BASE_PATH}/admin/subjects/${subjectId}/materials`);
  return response.data;
};

export const listAdminSubjects = async (): Promise<SubjectResponse[]> => {
  const response = await api.get(`${BASE_PATH}/admin/subjects`);
  return response.data;
};

export const listAdminJobs = async (
  subjectId?: string
): Promise<MaterialJobStatusResponse[]> => {
  const query = subjectId ? `?subject_id=${subjectId}` : "";
  const response = await api.get(`${BASE_PATH}/admin/material-jobs${query}`);
  return response.data;
};

export const createAdminJob = async (
  payload: AdminMaterialJobCreate
): Promise<MaterialJobStatusResponse> => {
  const response = await api.post(`${BASE_PATH}/admin/material-jobs`, payload);
  return response.data;
};

export const getJobStatus = async (jobId: string): Promise<MaterialJobStatusResponse> => {
  const response = await api.get(`${BASE_PATH}/admin/material-jobs/${jobId}`);
  return response.data;
};

export const approveJob = async (
  jobId: string,
  payload: AdminMaterialApproveRequest
): Promise<MaterialJobStatusResponse> => {
  const response = await api.post(`${BASE_PATH}/admin/material-jobs/${jobId}/approve`, payload);
  return response.data;
};

export const discardJobConcept = async (
  jobId: string,
  conceptId: string
): Promise<MaterialJobStatusResponse> => {
  const response = await api.delete(
    `${BASE_PATH}/admin/material-jobs/${jobId}/concepts/${conceptId}`
  );
  return response.data;
};

export const publishSubject = async (subjectId: string): Promise<SubjectResponse> => {
  const response = await api.post(`${BASE_PATH}/admin/subjects/${subjectId}/publish`, {});
  return response.data;
};

export const publishSelectedConcepts = async (
  subjectId: string,
  payload: AdminMaterialPublishRequest
): Promise<SubjectResponse> => {
  const response = await api.post(
    `${BASE_PATH}/admin/subjects/${subjectId}/publish/concepts`,
    payload
  );
  return response.data;
};

export const unpublishSubject = async (subjectId: string): Promise<SubjectResponse> => {
  const response = await api.post(`${BASE_PATH}/admin/subjects/${subjectId}/unpublish`, {});
  return response.data;
};

export const listPublishedSubjects = async (): Promise<SubjectResponse[]> => {
  const response = await api.get(`${BASE_PATH}/student/subjects`);
  return response.data;
};

export const enrollInSubject = async (
  subjectId: string
): Promise<SubjectEnrollmentResponse> => {
  const response = await api.post(`${BASE_PATH}/student/subjects/${subjectId}/enroll`, {});
  return response.data;
};

export const listPublishedConcepts = async (subjectId: string) => {
  const response = await api.get(`${BASE_PATH}/student/subjects/${subjectId}/concepts`);
  return response.data as SubjectResponse["concepts"];
};

export const getStudentSubjectProgression = async (
  subjectId: string
): Promise<StudentSubjectProgressResponse> => {
  const response = await api.get(`${BASE_PATH}/student/subjects/${subjectId}/progression`);
  return response.data;
};

export const markStudentTopicComplete = async (
  subjectId: string,
  conceptId: string
): Promise<StudentTopicProgressResponse> => {
  const response = await api.post(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/complete`,
    {}
  );
  return response.data;
};

export const listPublishedMaterials = async (
  subjectId: string
): Promise<ConceptMaterialResponse[]> => {
  const response = await api.get(`${BASE_PATH}/student/subjects/${subjectId}/materials`);
  return response.data;
};

export const getAdminLearningContent = async (
  subjectId: string,
  conceptId: string
): Promise<LearningContentResponse> => {
  const response = await api.get(
    `${BASE_PATH}/admin/subjects/${subjectId}/concepts/${conceptId}/learning`
  );
  return response.data;
};

export const updateAdminLearningContent = async (
  subjectId: string,
  conceptId: string,
  content: LearningContentResponse["content"]
): Promise<LearningContentResponse> => {
  const response = await api.patch(
    `${BASE_PATH}/admin/subjects/${subjectId}/concepts/${conceptId}/learning`,
    { content }
  );
  return response.data;
};

export const getStudentLearningContent = async (
  subjectId: string,
  conceptId: string
): Promise<LearningContentResponse> => {
  const response = await api.get(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/learning`
  );
  return response.data;
};

export const getLearningBotSession = async (
  subjectId: string,
  conceptId: string
): Promise<LearningBotSessionDetailResponse> => {
  const response = await api.get(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/learning-bot/session`
  );
  return response.data;
};

export const sendLearningBotMessage = async (
  subjectId: string,
  conceptId: string,
  message: string
): Promise<LearningBotTurnResponse> => {
  const response = await api.post(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/learning-bot/messages`,
    { message }
  );
  return response.data;
};

export const resetLearningBotSession = async (
  subjectId: string,
  conceptId: string
): Promise<LearningBotSessionDetailResponse> => {
  const response = await api.post(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/learning-bot/session/reset`,
    {}
  );
  return response.data;
};

export const listStudentBookmarks = async (
  subjectId?: string
): Promise<ConceptBookmarkResponse[]> => {
  const query = subjectId ? `?subject_id=${subjectId}` : "";
  const response = await api.get(`${BASE_PATH}/student/bookmarks${query}`);
  return response.data;
};

export const getAdminConceptResources = async (
  subjectId: string,
  conceptId: string
): Promise<ConceptResourcesResponse> => {
  const response = await api.get(
    `${BASE_PATH}/admin/subjects/${subjectId}/concepts/${conceptId}/resources`
  );
  return response.data;
};

export const listAdminEnrolledStudents = async (
  subjectId: string
): Promise<AdminEnrolledStudentResponse[]> => {
  const response = await api.get(`${BASE_PATH}/admin/subjects/${subjectId}/enrollments`);
  return response.data;
};

export const getAdminStudentActivity = async (
  subjectId: string,
  studentId: string
): Promise<AdminStudentActivityResponse> => {
  const response = await api.get(
    `${BASE_PATH}/admin/subjects/${subjectId}/students/${studentId}/activity`
  );
  return response.data;
};

export const getAdminConceptImages = async (
  subjectId: string,
  conceptId: string
): Promise<ConceptImageCollectionResponse> => {
  const response = await api.get(
    `${BASE_PATH}/admin/subjects/${subjectId}/concepts/${conceptId}/images`
  );
  return response.data;
};

export const generateAdminConceptImages = async (
  subjectId: string,
  conceptId: string,
  payload: {
    prompt?: string;
    refresh?: boolean;
  } = {}
): Promise<ConceptImageCollectionResponse> => {
  const response = await api.post(
    `${BASE_PATH}/admin/subjects/${subjectId}/concepts/${conceptId}/images/generate`,
    {
      prompt: payload.prompt ?? null,
      refresh: payload.refresh ?? false
    }
  );
  return response.data;
};

export const approveAdminConceptImage = async (
  subjectId: string,
  conceptId: string,
  imageId: string
): Promise<ConceptImageCollectionResponse> => {
  const response = await api.post(
    `${BASE_PATH}/admin/subjects/${subjectId}/concepts/${conceptId}/images/${imageId}/approve`,
    {}
  );
  return response.data;
};

export const rejectAdminConceptImage = async (
  subjectId: string,
  conceptId: string,
  imageId: string
): Promise<ConceptImageCollectionResponse> => {
  const response = await api.post(
    `${BASE_PATH}/admin/subjects/${subjectId}/concepts/${conceptId}/images/${imageId}/reject`,
    {}
  );
  return response.data;
};

export const fetchAdminConceptImageBlob = async (
  subjectId: string,
  conceptId: string,
  imageId: string,
  variant: "full" | "thumb" = "thumb"
): Promise<Blob> => {
  const response = await api.get(
    `${BASE_PATH}/admin/subjects/${subjectId}/concepts/${conceptId}/images/${imageId}/file`,
    { params: { variant }, responseType: "blob" }
  );
  return response.data as Blob;
};

export const getStudentConceptImages = async (
  subjectId: string,
  conceptId: string
): Promise<ConceptImageCollectionResponse> => {
  const response = await api.get(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/images`
  );
  return response.data;
};

export const fetchStudentConceptImageBlob = async (
  subjectId: string,
  conceptId: string,
  imageId: string,
  variant: "full" | "thumb" = "thumb"
): Promise<Blob> => {
  const response = await api.get(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/images/${imageId}/file`,
    { params: { variant }, responseType: "blob" }
  );
  return response.data as Blob;
};

export const refreshAdminConceptVideo = async (
  subjectId: string,
  conceptId: string,
  url: string
): Promise<ConceptResourcesResponse> => {
  const response = await api.post(
    `${BASE_PATH}/admin/subjects/${subjectId}/concepts/${conceptId}/resources/videos/refresh`,
    { url }
  );
  return response.data;
};

export const approveAdminConceptVideo = async (
  subjectId: string,
  conceptId: string,
  url: string
): Promise<ConceptResourcesResponse> => {
  const response = await api.post(
    `${BASE_PATH}/admin/subjects/${subjectId}/concepts/${conceptId}/resources/videos/approve`,
    { url }
  );
  return response.data;
};

export const addStudentBookmark = async (subjectId: string, conceptId: string) => {
  await api.post(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/bookmark`
  );
};

export const removeStudentBookmark = async (subjectId: string, conceptId: string) => {
  await api.delete(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/bookmark`
  );
};

const downloadBlob = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const fetchBlob = async (url: string) => {
  const response = await api.get(url, { responseType: "blob" });
  return response.data as Blob;
};

export const downloadAdminJobZip = async (jobId: string) => {
  const response = await api.get(`${BASE_PATH}/admin/material-jobs/${jobId}/download.zip`, {
    responseType: "blob"
  });
  downloadBlob(response.data, `study-material-${jobId}.zip`);
};

export const downloadApprovedMaterialsBundle = async (subjectId: string) => {
  const response = await api.get(
    `${BASE_PATH}/admin/subjects/${subjectId}/approved-materials.zip`,
    { responseType: "blob" }
  );
  downloadBlob(response.data, `approved-materials-${subjectId}.zip`);
};

export const downloadAdminJobArtifact = async (jobId: string, artifactName: string) => {
  const response = await api.get(`${BASE_PATH}/admin/material-jobs/${jobId}/artifacts/${artifactName}`, {
    responseType: "blob"
  });
  downloadBlob(response.data, `${artifactName}-${jobId}`);
};

export const downloadAdminConceptArtifact = async (
  jobId: string,
  conceptId: string,
  artifactName: string
) => {
  const response = await api.get(
    `${BASE_PATH}/admin/material-jobs/${jobId}/concepts/${conceptId}/artifacts/${artifactName}`,
    { responseType: "blob" }
  );
  downloadBlob(response.data, `${artifactName}-${conceptId}`);
};

export const fetchAdminConceptArtifact = async (
  jobId: string,
  conceptId: string,
  artifactName: string
) => {
  return fetchBlob(
    `${BASE_PATH}/admin/material-jobs/${jobId}/concepts/${conceptId}/artifacts/${artifactName}`
  );
};

export const downloadStudentConceptArtifact = async (
  subjectId: string,
  conceptId: string,
  artifactName: string
) => {
  const response = await api.get(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/artifacts/${artifactName}`,
    { responseType: "blob" }
  );
  downloadBlob(response.data, `${artifactName}-${conceptId}`);
};

export const fetchStudentConceptArtifact = async (
  subjectId: string,
  conceptId: string,
  artifactName: string
) => {
  return fetchBlob(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/artifacts/${artifactName}`
  );
};

export const downloadStudentSubjectArtifact = async (subjectId: string, artifactName: string) => {
  const response = await api.get(`${BASE_PATH}/student/subjects/${subjectId}/artifacts/${artifactName}`, {
    responseType: "blob"
  });
  downloadBlob(response.data, `${artifactName}-${subjectId}`);
};

export const fetchStudentSubjectArtifact = async (subjectId: string, artifactName: string) => {
  return fetchBlob(`${BASE_PATH}/student/subjects/${subjectId}/artifacts/${artifactName}`);
};

export const getStudentFlashcards = async (
  subjectId: string,
  conceptId: string
): Promise<FlashcardItem[]> => {
  const response = await api.get(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/artifacts/flashcards_json`
  );
  const data = response.data;
  if (Array.isArray(data) && data.length) {
    const entry = data[0] as { flashcards?: FlashcardItem[] };
    return Array.isArray(entry.flashcards) ? entry.flashcards : [];
  }
  if (data && Array.isArray(data.flashcards)) {
    return data.flashcards as FlashcardItem[];
  }
  return [];
};

export const getStudentResources = async (
  subjectId: string,
  conceptId: string
): Promise<ResourceItem[]> => {
  const response = await api.get(
    `${BASE_PATH}/student/subjects/${subjectId}/concepts/${conceptId}/artifacts/resources_json`
  );
  const data = response.data;
  if (Array.isArray(data) && data.length) {
    const entry = data[0] as { resources?: ResourceItem[] };
    return Array.isArray(entry.resources) ? entry.resources : [];
  }
  if (data && Array.isArray(data.resources)) {
    return data.resources as ResourceItem[];
  }
  return [];
};
