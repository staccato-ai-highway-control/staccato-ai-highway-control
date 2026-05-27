import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import type { Report, ReportPriority, ReportType, ReportUploadResponse, UploadPurpose } from "./types";

export type CreateReportPayload = {
  title: string;
  reportType?: ReportType;
  purpose?: UploadPurpose;
  description?: string;
  location?: string;
  cctvId?: string;
};

export type UploadReportPayload = {
  files: File[];
  reportType?: ReportType;
  uploadPurpose?: UploadPurpose;
  title: string;
  description?: string;
  location?: string;
  priority?: ReportPriority;
  latitude?: number;
  longitude?: number;
  isDemoData?: boolean;
};

export type CreateIncidentReportPayload = CreateReportPayload & {
  file: File;
  priority?: ReportPriority;
  latitude?: number;
  longitude?: number;
  isDemoData?: boolean;
};

type ListResponse = FlexibleApiResponse<Report[]> | { reports?: Report[] };

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

function appendOptional(formData: FormData, key: string, value: string | number | boolean | null | undefined) {
  if (value !== null && value !== undefined && value !== "") formData.append(key, String(value));
}

export function getReportsHealth() {
  return apiClient("/api/reports/health", { auth: false });
}

export async function getReports() {
  const response = await apiClient<ListResponse>("/api/reports");
  if (Array.isArray(response)) return response;
  if ("reports" in response && response.reports) return response.reports;
  return getEnvelopeData<Report[]>(response as FlexibleApiResponse<Report[]>);
}

export async function getReport(id: string) {
  const response = await apiClient<FlexibleApiResponse<Report>>('/api/reports/' + id);
  return getEnvelopeData<Report>(response);
}

export async function createReport(payload: CreateReportPayload) {
  const response = await apiClient<FlexibleApiResponse<ReportUploadResponse>>("/api/reports", {
    method: "POST",
    body: {
      report_type: payload.reportType ?? "GENERAL",
      upload_purpose: payload.purpose ?? "ANALYSIS",
      subject: payload.title,
      title: payload.title,
      description: payload.description,
      location: payload.location,
      cctv_id: payload.cctvId,
      priority: "NORMAL",
    },
  });

  return getEnvelopeData<ReportUploadResponse>(response);
}

export async function uploadReport(payload: UploadReportPayload) {
  const formData = new FormData();

  payload.files.forEach((file) => formData.append("files", file));
  formData.append("report_type", payload.reportType ?? "GENERAL");
  formData.append("upload_purpose", payload.uploadPurpose ?? "ANALYSIS");
  formData.append("title", payload.title);
  formData.append("subject", payload.title);
  appendOptional(formData, "description", payload.description);
  appendOptional(formData, "location", payload.location);
  formData.append("priority", payload.priority ?? "NORMAL");
  appendOptional(formData, "latitude", payload.latitude);
  appendOptional(formData, "longitude", payload.longitude);
  formData.append("is_demo_data", String(Boolean(payload.isDemoData)));

  const response = await apiClient<FlexibleApiResponse<ReportUploadResponse>>("/api/reports", {
    method: "POST",
    formData,
  });

  return getEnvelopeData<ReportUploadResponse>(response);
}

export async function searchLocations(keyword: string, size = 5) {
  const params = new URLSearchParams({
    keyword,
    size: String(size),
  });
  const response = await apiClient<LocationSearchResponse>(`/api/locations/search?${params.toString()}`);
  const data = Array.isArray(response) ? { items: response } : getEnvelopeData<{ items?: LocationSearchItem[] }>(response);

  return data.items ?? [];
}

export async function createIncidentReport(payload: CreateIncidentReportPayload) {
  return uploadReport({
    files: [payload.file],
    reportType: payload.reportType ?? "GENERAL",
    uploadPurpose: payload.purpose ?? "ANALYSIS",
    title: payload.title,
    description: payload.description,
    location: payload.location,
    priority: payload.priority ?? "NORMAL",
    latitude: payload.latitude,
    longitude: payload.longitude,
    isDemoData: payload.isDemoData ?? payload.purpose === "TEST_DEMO",
  });
}

export async function uploadReportAttachment(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiClient<{ ok: boolean }>('/api/reports/' + id + '/attachments', { method: "POST", formData });
}

export async function requestReportAnalysis(id: string) {
  return apiClient<{ ok: boolean }>('/api/reports/' + id + '/analyze', { method: "POST" });
}
