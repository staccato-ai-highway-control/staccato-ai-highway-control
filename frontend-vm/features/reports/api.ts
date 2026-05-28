import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import { API_BASE_URL } from "@/lib/constants";
import { getStoredAccessToken } from "@/lib/authStorage";
import type {
  MyReportListParams,
  PaginatedReports,
  Report,
  ReportListParams,
  ReportPriority,
  ReportType,
  ReportUploadResponse,
  UpdateReportPayload,
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

type RawReportDetailResponse = FlexibleApiResponse<Report> | { success?: boolean; message?: string; data?: Report; report?: Report } | Report;

type LocationSearchResponse =
  | FlexibleApiResponse<{ items?: LocationSearchItem[] }>
  | { items?: LocationSearchItem[] }
  | LocationSearchItem[];


function joinUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function isHtmlPayload(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("<!doctype html") || normalized.startsWith("<html") || normalized.includes("werkzeug debugger");
}

async function fetchAttachmentBlob(path: string) {
  const token = getStoredAccessToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(joinUrl(path), { headers });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (text && !isHtmlPayload(text)) throw new Error(text);
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
  return apiClient<{ ok?: boolean; success?: boolean; message?: string }>(`/api/reports/${reportId}/analyze`, {
    method: "POST",
    body: payload ?? {},
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
