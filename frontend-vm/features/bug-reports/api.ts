import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import { API_BASE_URL } from "@/lib/constants";
import { getStoredAccessToken } from "@/lib/authStorage";
import type {
  BugReport,
  BugReportAttachment,
  BugReportAttachmentUploadResponse,
  BugReportCreateRequest,
  BugReportListParams,
  BugReportListResponse,
  BugReportUpdateRequest,
} from "./types";

type RawBugReportListResponse =
  | BugReport[]
  | FlexibleApiResponse<BugReportListResponse | BugReport[]>
  | { items?: BugReport[]; page?: number; size?: number; total_count?: number; total_pages?: number };

type RawBugReportDetailResponse =
  | FlexibleApiResponse<BugReport>
  | { bug_report?: BugReport; report?: BugReport }
  | BugReport;

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

function buildQuery(params: BugReportListParams = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeBugReportList(response: RawBugReportListResponse): BugReportListResponse {
  if (Array.isArray(response)) {
    return { items: response, page: 1, size: response.length, total_count: response.length, total_pages: 1 };
  }

  const data = getEnvelopeData<BugReportListResponse | BugReport[]>(
    response as FlexibleApiResponse<BugReportListResponse | BugReport[]>
  );

  if (Array.isArray(data)) {
    return { items: data, page: 1, size: data.length, total_count: data.length, total_pages: 1 };
  }

  return {
    items: data.items ?? [],
    page: data.page ?? 1,
    size: data.size ?? data.items?.length ?? 0,
    total_count: data.total_count ?? data.items?.length ?? 0,
    total_pages: data.total_pages ?? 1,
  };
}

async function fetchAttachmentBlob(path: string) {
  const headers = new Headers();
  const token = getStoredAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(joinUrl(path), { headers });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (text && !isUnsafeErrorText(text)) throw new Error(text);
    throw new Error("첨부파일을 다운로드할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }

  return response.blob();
}

export async function fetchBugReports(params: BugReportListParams = {}) {
  const response = await apiClient<RawBugReportListResponse>(`/api/bug-reports${buildQuery(params)}`, { auth: false });
  return normalizeBugReportList(response);
}

export async function getMyBugReports(params: BugReportListParams = {}) {
  const response = await apiClient<RawBugReportListResponse>(`/api/bug-reports/my${buildQuery(params)}`);
  return normalizeBugReportList(response);
}

export async function fetchBugReport(id: string | number) {
  const response = await apiClient<RawBugReportDetailResponse>(`/api/bug-reports/${id}`, { auth: false });

  if (typeof response === "object" && response !== null) {
    const detail = response as { data?: BugReport; bug_report?: BugReport; report?: BugReport };
    if (detail.data) return detail.data;
    if (detail.bug_report) return detail.bug_report;
    if (detail.report) return detail.report;
  }

  return getEnvelopeData<BugReport>(response as FlexibleApiResponse<BugReport>);
}

export async function updateBugReport(id: string | number, payload: BugReportUpdateRequest) {
  const response = await apiClient<FlexibleApiResponse<BugReport> | { bug_report?: BugReport }>(`/api/bug-reports/${id}`, {
    method: "PATCH",
    body: payload,
  });

  if (typeof response === "object" && response !== null && "bug_report" in response && (response as { bug_report?: BugReport }).bug_report) {
    return (response as { bug_report: BugReport }).bug_report;
  }

  return getEnvelopeData<BugReport>(response as FlexibleApiResponse<BugReport>);
}

export function closeBugReport(id: string | number) {
  return apiClient<FlexibleApiResponse<BugReport> | { bug_report?: BugReport }>(`/api/bug-reports/${id}`, {
    method: "DELETE",
  });
}

export async function createBugReport(payload: BugReportCreateRequest) {
  const response = await apiClient<FlexibleApiResponse<BugReport> | { data?: BugReport; id?: number | string }>(
    "/api/bug-reports",
    {
      method: "POST",
      auth: false,
      body: payload,
    }
  );

  return getEnvelopeData<BugReport | { id?: number | string }>(
    response as FlexibleApiResponse<BugReport | { id?: number | string }>
  );
}

export async function uploadBugReportAttachments(bugReportId: string | number, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  return apiClient<BugReportAttachmentUploadResponse>(`/api/bug-reports/${bugReportId}/attachments`, {
    method: "POST",
    formData,
  });
}

export function downloadBugReportAttachment(attachmentId: string | number) {
  return fetchAttachmentBlob(`/api/bug-reports/attachments/${attachmentId}/download`);
}

export function downloadBugReportAttachmentUrl(path: string) {
  return fetchAttachmentBlob(path);
}

export function getBugReportAttachmentId(attachment: BugReportAttachment) {
  return attachment.id;
}
