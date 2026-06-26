import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import { API_BASE_URL } from "@/lib/constants";
import { getStoredAccessToken } from "@/lib/authStorage";
import type {
  MyReportListParams,
  PaginatedReports,
  Report,
  ReportListParams,
  ReportPriority,
  PaginatedReportDrafts,
  ReportDraft,
  ReportDraftPayload,
  ReportDraftResponse,
  ReportDraftSubmitResponse,
  ReportType,
  ReportAnalysisJob,
  ReportAnalysisRequestResponse,
  ReportAnalysisComparisonCandidate,
  ReportAnalysisComparisonCandidatesResult,
  ReportAnalysisComparisonResult,
  ReportAnalysisStatus,
  ReportUploadResponse,
  UpdateReportPayload,
  UpdateReportStatusPayload,
  UploadPurpose,
} from "./types";

export type UploadReportPayload = {
  files: File[];
  reportType?: ReportType;
  uploadPurpose?: UploadPurpose;
  title: string;
  subject?: string;
  description?: string;
  location?: string;
  address?: string;
  placeName?: string;
  priority?: ReportPriority;
  latitude?: number;
  longitude?: number;
  isDemoData?: boolean;
};

export type CreateReportPayload = UploadReportPayload;

export type CreateIncidentReportPayload = Omit<UploadReportPayload, "files"> & {
  file: File;
};

type RawReportListResponse =
  | Report[]
  | {
      success?: boolean;
      data?: Report[] | Partial<PaginatedReports>;
      items?: Report[];
      reports?: Report[];
      page?: number;
      size?: number;
      total_count?: number;
      total_pages?: number;
    };

type RawReportDetailResponse = FlexibleApiResponse<Report> | { success?: boolean; message?: string; data?: Report; report?: Report } | Report;

type RawReportDraftListResponse =
  | ReportDraft[]
  | FlexibleApiResponse<Partial<PaginatedReportDrafts> | ReportDraft[]>
  | {
      success?: boolean;
      data?: Partial<PaginatedReportDrafts> | ReportDraft[];
      drafts?: ReportDraft[];
      items?: ReportDraft[];
      page?: number;
      size?: number;
      total_count?: number;
      total_pages?: number;
    };

type RawReportDraftDetailResponse = FlexibleApiResponse<ReportDraft> | { success?: boolean; message?: string; draft?: ReportDraft; data?: ReportDraft } | ReportDraft;

type RawAnalysisComparisonCandidatesResponse =
  | ReportAnalysisComparisonCandidate[]
  | FlexibleApiResponse<ReportAnalysisComparisonCandidatesResult | ReportAnalysisComparisonCandidate[]>
  | { candidates?: ReportAnalysisComparisonCandidate[]; items?: ReportAnalysisComparisonCandidate[] };

type RawAnalysisComparisonResponse =
  | FlexibleApiResponse<ReportAnalysisComparisonResult>
  | { comparison?: ReportAnalysisComparisonResult };

export type LocationSearchItem = {
  id?: string | number;
  location?: string;
  name?: string;
  title?: string;
  address?: string;
  road_name?: string;
  roadName?: string;
  location_name?: string;
  locationName?: string;
  latitude?: number | string;
  longitude?: number | string;
};

type LocationSearchResponse =
  | FlexibleApiResponse<{ items?: LocationSearchItem[] }>
  | { items?: LocationSearchItem[] }
  | LocationSearchItem[];

function joinUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function isUnsafeErrorText(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("<!doctype html") ||
    normalized.startsWith("<html") ||
    normalized.includes("werkzeug debugger") ||
    normalized.includes("traceback") ||
    normalized.includes("sqlalchemy") ||
    normalized.includes("internal server error") ||
    normalized.includes("axioserror") ||
    normalized.includes("typeerror:") ||
    /https?:\/\//i.test(value) ||
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(value) ||
    /\/(?:home|var|usr|tmp)\//.test(value)
  );
}

async function fetchAttachmentBlob(path: string) {
  const token = getStoredAccessToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(joinUrl(path), { headers });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (text && !isUnsafeErrorText(text)) throw new Error(text);
    throw new Error(`첨부파일 요청 실패: ${response.status}`);
  }

  return response.blob();
}

function appendOptional(formData: FormData, key: string, value: string | number | boolean | null | undefined) {
  if (value !== null && value !== undefined && value !== "") formData.append(key, String(value));
}

function appendFiniteNumber(formData: FormData, key: string, value: number | null | undefined) {
  if (value !== null && value !== undefined && Number.isFinite(value)) formData.append(key, String(value));
}

function buildQuery(params: ReportListParams | MyReportListParams | Record<string, string | number | boolean | undefined> = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeReportDraftList(response: RawReportDraftListResponse): PaginatedReportDrafts {
  if (Array.isArray(response)) {
    return { items: response, page: 1, size: response.length, total_count: response.length, total_pages: 1 };
  }

  const draftResponse = response as {
    data?: Partial<PaginatedReportDrafts> | ReportDraft[];
    drafts?: ReportDraft[];
    items?: ReportDraft[];
    page?: number;
    size?: number;
    total_count?: number;
    total_pages?: number;
  };
  const data = draftResponse.data;

  if (Array.isArray(data)) {
    return { items: data, page: draftResponse.page ?? 1, size: draftResponse.size ?? data.length, total_count: draftResponse.total_count ?? data.length, total_pages: draftResponse.total_pages ?? 1 };
  }

  if (data && Array.isArray(data.items)) {
    return {
      items: data.items,
      page: data.page ?? draftResponse.page ?? 1,
      size: data.size ?? draftResponse.size ?? data.items.length,
      total_count: data.total_count ?? draftResponse.total_count ?? data.items.length,
      total_pages: data.total_pages ?? draftResponse.total_pages ?? 1,
    };
  }

  const items = draftResponse.drafts ?? draftResponse.items ?? [];
  return {
    items,
    page: draftResponse.page ?? 1,
    size: draftResponse.size ?? items.length,
    total_count: draftResponse.total_count ?? items.length,
    total_pages: draftResponse.total_pages ?? 1,
  };
}

function normalizeReportList(response: RawReportListResponse): PaginatedReports {
  if (Array.isArray(response)) {
    return { items: response, page: 1, size: response.length, total_count: response.length, total_pages: 1 };
  }

  const data = response.data;

  if (Array.isArray(data)) {
    return { items: data, page: response.page ?? 1, size: response.size ?? data.length, total_count: response.total_count ?? data.length, total_pages: response.total_pages ?? 1 };
  }

  if (data && Array.isArray(data.items)) {
    return {
      items: data.items,
      page: data.page ?? response.page ?? 1,
      size: data.size ?? response.size ?? data.items.length,
      total_count: data.total_count ?? response.total_count ?? data.items.length,
      total_pages: data.total_pages ?? response.total_pages ?? 1,
    };
  }

  const items = response.items ?? response.reports ?? [];
  return {
    items,
    page: response.page ?? 1,
    size: response.size ?? items.length,
    total_count: response.total_count ?? items.length,
    total_pages: response.total_pages ?? 1,
  };
}

export function getReportsHealth() {
  return apiClient("/api/reports/health", { auth: false });
}

export async function getReports(params: ReportListParams = {}) {
  const response = await apiClient<RawReportListResponse>(`/api/reports${buildQuery(params)}`);
  return normalizeReportList(response);
}

export async function getMyReports(params: MyReportListParams = {}) {
  const response = await apiClient<RawReportListResponse>(`/api/reports/my${buildQuery(params)}`);
  return normalizeReportList(response);
}

export async function getReport(reportId: string | number) {
  const response = await apiClient<RawReportDetailResponse>(`/api/reports/${reportId}`);

  if (typeof response === "object" && response !== null) {
    const detail = response as { data?: Report; report?: Report };
    if (detail.data) return detail.data;
    if (detail.report) return detail.report;
  }

  return getEnvelopeData<Report>(response as FlexibleApiResponse<Report>);
}

export async function createReportDraft(payload: ReportDraftPayload) {
  const response = await apiClient<ReportDraftResponse>("/api/reports/drafts", {
    method: "POST",
    body: payload,
  });
  return response;
}

export async function getMyReportDrafts(params: { page?: number; size?: number } = {}) {
  const response = await apiClient<RawReportDraftListResponse>("/api/reports/drafts" + buildQuery(params));
  return normalizeReportDraftList(response);
}

export async function getReportDraft(draftId: string | number) {
  const response = await apiClient<RawReportDraftDetailResponse>("/api/reports/drafts/" + draftId);

  if (typeof response === "object" && response !== null) {
    const detail = response as { data?: ReportDraft; draft?: ReportDraft };
    if (detail.draft) return detail.draft;
    if (detail.data) return detail.data;
  }

  return getEnvelopeData<ReportDraft>(response as FlexibleApiResponse<ReportDraft>);
}

export async function updateReportDraft(draftId: string | number, payload: ReportDraftPayload) {
  const response = await apiClient<ReportDraftResponse>("/api/reports/drafts/" + draftId, {
    method: "PATCH",
    body: payload,
  });
  return response;
}

export function deleteReportDraft(draftId: string | number) {
  return apiClient<{ success?: boolean; message?: string }>("/api/reports/drafts/" + draftId, { method: "DELETE" });
}

export function submitReportDraft(draftId: string | number) {
  return apiClient<ReportDraftSubmitResponse>("/api/reports/drafts/" + draftId + "/submit", {
    method: "POST",
    body: {},
  });
}

export function createReport(payload: CreateReportPayload) {
  return uploadReport(payload);
}

export async function uploadReport(payload: UploadReportPayload) {
  const formData = new FormData();

  payload.files.forEach((file) => formData.append("files", file));
  appendOptional(formData, "report_type", payload.reportType ?? "GENERAL");
  appendOptional(formData, "upload_purpose", payload.uploadPurpose ?? "ANALYSIS");
  appendOptional(formData, "title", payload.title);
  appendOptional(formData, "subject", payload.subject);
  appendOptional(formData, "description", payload.description);
  appendOptional(formData, "priority", payload.priority ?? "NORMAL");
  appendOptional(formData, "is_demo_data", payload.isDemoData ? 1 : undefined);
  appendOptional(formData, "location", payload.location);
  appendOptional(formData, "address", payload.address);
  appendOptional(formData, "place_name", payload.placeName);
  appendFiniteNumber(formData, "latitude", payload.latitude);
  appendFiniteNumber(formData, "longitude", payload.longitude);

  const response = await apiClient<FlexibleApiResponse<ReportUploadResponse>>("/api/reports", {
    method: "POST",
    formData,
  });

  return getEnvelopeData<ReportUploadResponse>(response);
}

export async function updateReport(reportId: string | number, payload: UpdateReportPayload) {
  const response = await apiClient<FlexibleApiResponse<Report>>(`/api/reports/${reportId}`, {
    method: "PATCH",
    body: payload,
  });
  return getEnvelopeData<Report>(response);
}

export function deleteReport(reportId: string | number) {
  return apiClient<{ success?: boolean; message?: string }>(`/api/reports/${reportId}`, { method: "DELETE" });
}

export async function searchLocations(keyword: string, size = 5) {
  const params = new URLSearchParams({ keyword, size: String(size) });
  const response = await apiClient<LocationSearchResponse>(`/api/locations/search?${params.toString()}`);
  const data = Array.isArray(response) ? { items: response } : getEnvelopeData<{ items?: LocationSearchItem[] }>(response);

  return data.items ?? [];
}

export async function createIncidentReport(payload: CreateIncidentReportPayload) {
  return uploadReport({
    ...payload,
    files: [payload.file],
    reportType: payload.reportType ?? "GENERAL",
    uploadPurpose: payload.uploadPurpose ?? "ANALYSIS",
    priority: payload.priority ?? "NORMAL",
    isDemoData: payload.isDemoData ?? payload.uploadPurpose === "TEST_DEMO",
  });
}

export function requestReportAnalysis(reportId: string | number, payload?: Record<string, unknown>) {
  return apiClient<ReportAnalysisRequestResponse>(`/api/reports/${reportId}/analyze`, {
    method: "POST",
    body: payload ?? {},
  });
}

export async function getAnalysisComparisonCandidates(params: { report_id?: string | number; selectedJobId?: string | number }) {
  const response = await apiClient<RawAnalysisComparisonCandidatesResponse>("/api/reports/analysis-comparisons/candidates" + buildQuery(params));
  if (Array.isArray(response)) return response;

  const direct = response as { candidates?: ReportAnalysisComparisonCandidate[]; items?: ReportAnalysisComparisonCandidate[] };
  if (direct.candidates) return direct.candidates;
  if (direct.items) return direct.items;

  const data = getEnvelopeData<ReportAnalysisComparisonCandidatesResult | ReportAnalysisComparisonCandidate[]>(response as FlexibleApiResponse<ReportAnalysisComparisonCandidatesResult | ReportAnalysisComparisonCandidate[]>);
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export async function createAnalysisComparison(jobIds: Array<string | number>) {
  const response = await apiClient<RawAnalysisComparisonResponse>("/api/reports/analysis-comparisons", {
    method: "POST",
    body: { job_ids: jobIds },
  });

  if (typeof response === "object" && response !== null && "comparison" in response && (response as { comparison?: ReportAnalysisComparisonResult }).comparison) {
    return (response as { comparison: ReportAnalysisComparisonResult }).comparison;
  }

  return getEnvelopeData<ReportAnalysisComparisonResult>(response as FlexibleApiResponse<ReportAnalysisComparisonResult>);
}
export async function getReportAnalysisStatus(reportId: string | number) {
  const response = await apiClient<FlexibleApiResponse<ReportAnalysisStatus> | { report?: ReportAnalysisStatus }>(`/api/reports/${reportId}/analysis-status`);
  if (typeof response === "object" && response !== null && "report" in response && (response as { report?: ReportAnalysisStatus }).report) {
    return (response as { report: ReportAnalysisStatus }).report;
  }
  return getEnvelopeData<ReportAnalysisStatus>(response as FlexibleApiResponse<ReportAnalysisStatus>);
}

export async function getReportAnalysisJobs(reportId: string | number) {
  const response = await apiClient<FlexibleApiResponse<ReportAnalysisJob[]> | { jobs?: ReportAnalysisJob[] }>(`/api/reports/${reportId}/analysis-jobs`);
  if (typeof response === "object" && response !== null && "jobs" in response) return (response as { jobs?: ReportAnalysisJob[] }).jobs ?? [];
  return getEnvelopeData<ReportAnalysisJob[]>(response as FlexibleApiResponse<ReportAnalysisJob[]>);
}

export async function getReportAnalysisJob(jobId: string | number) {
  const response = await apiClient<FlexibleApiResponse<ReportAnalysisJob>>(`/api/reports/analysis-jobs/${jobId}`);
  return getEnvelopeData<ReportAnalysisJob>(response);
}

export async function retryReportAnalysisJob(jobId: string | number) {
  const response = await apiClient<FlexibleApiResponse<ReportAnalysisJob> | { job?: ReportAnalysisJob }>(`/api/reports/analysis-jobs/${jobId}/retry`, {
    method: "POST",
    body: {},
  });
  if (typeof response === "object" && response !== null && "job" in response && (response as { job?: ReportAnalysisJob }).job) {
    return (response as { job: ReportAnalysisJob }).job;
  }
  return getEnvelopeData<ReportAnalysisJob>(response as FlexibleApiResponse<ReportAnalysisJob>);
}

export async function updateReportStatus(reportId: string | number, payload: UpdateReportStatusPayload) {
  const response = await apiClient<FlexibleApiResponse<Report> | { report?: Report }>(`/api/reports/${reportId}/status`, {
    method: "PATCH",
    body: payload,
  });
  if (typeof response === "object" && response !== null && "report" in response && (response as { report?: Report }).report) {
    return (response as { report: Report }).report;
  }
  return getEnvelopeData<Report>(response as FlexibleApiResponse<Report>);
}

export function approveReport(reportId: string | number, memo = "") {
  return apiClient<FlexibleApiResponse<Report> | { report?: Report }>(`/api/reports/${reportId}/approve`, {
    method: "POST",
    body: { memo },
  });
}

export function rejectReport(reportId: string | number, reason: string) {
  return apiClient<FlexibleApiResponse<Report> | { report?: Report }>(`/api/reports/${reportId}/reject`, {
    method: "POST",
    body: { reason },
  });
}


export async function uploadReportAttachments(reportId: string | number, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  return apiClient<{ success?: boolean; message?: string; data?: unknown }>(`/api/reports/${reportId}/attachments`, {
    method: "POST",
    formData,
  });
}

export function deleteReportAttachment(reportId: string | number, attachmentId: string | number, reason?: string) {
  return apiClient<{ success?: boolean; message?: string }>(`/api/reports/${reportId}/attachments/${attachmentId}`, {
    method: "DELETE",
    body: reason ? { reason } : undefined,
  });
}

export function previewReportAttachment(attachmentId: string | number) {
  return fetchAttachmentBlob(`/api/reports/attachments/${attachmentId}/preview`);
}

export function previewReportAttachmentUrl(path: string) {
  return fetchAttachmentBlob(path);
}

export function downloadReportAttachment(attachmentId: string | number) {
  return fetchAttachmentBlob(`/api/reports/attachments/${attachmentId}/download`);
}

export function downloadReportAttachmentUrl(path: string) {
  return fetchAttachmentBlob(path);
}
