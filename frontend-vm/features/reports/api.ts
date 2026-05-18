import { apiClient } from "@/lib/apiClient";
import { mockReports } from "./mock";
import type { ReportPriority, ReportType, UploadPurpose } from "./types";

export type CreateReportPayload = {
  title: string;
  reportType: ReportType;
  purpose: UploadPurpose;
  description?: string;
  location?: string;
  cctvId?: string;
};

export type UploadReportPayload = {
  files: File[];
  reportType: ReportType;
  uploadPurpose: UploadPurpose;
  title: string;
  description?: string;
  priority: ReportPriority;
  latitude: number;
  longitude: number;
  isDemoData: boolean;
};

export type CreateIncidentReportPayload = CreateReportPayload & {
  file: File;
  priority?: ReportPriority;
  latitude?: number;
  longitude?: number;
  isDemoData?: boolean;
};

export function getReportsHealth() {
  return apiClient("/api/reports/health", { auth: false });
}

export async function getReports() {
  return mockReports;
}

export async function getReport(id: string) {
  return mockReports.find((report) => report.id === id) ?? mockReports[0];
}

export async function createReport(payload: CreateReportPayload) {
  return apiClient<{ id: string }>("/api/reports", { method: "POST", body: payload });
}

export async function uploadReport(payload: UploadReportPayload) {
  const formData = new FormData();

  payload.files.forEach((file) => formData.append("files", file));
  formData.append("report_type", payload.reportType);
  formData.append("upload_purpose", payload.uploadPurpose);
  formData.append("title", payload.title);
  formData.append("subject", payload.title);
  formData.append("description", payload.description ?? "");
  formData.append("priority", payload.priority);
  formData.append("latitude", String(payload.latitude));
  formData.append("longitude", String(payload.longitude));
  formData.append("is_demo_data", String(payload.isDemoData));

  return apiClient<{ id?: string; data?: unknown; message?: string }>("/api/reports", {
    method: "POST",
    formData,
  });
}

export async function createIncidentReport(payload: CreateIncidentReportPayload) {
  return uploadReport({
    files: [payload.file],
    reportType: payload.reportType,
    uploadPurpose: payload.purpose,
    title: payload.title,
    description: payload.description,
    priority: payload.priority ?? "MEDIUM",
    latitude: payload.latitude ?? 37.2636,
    longitude: payload.longitude ?? 127.0286,
    isDemoData: payload.isDemoData ?? payload.purpose === "TEST_DEMO",
  });
}

export async function uploadReportAttachment(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiClient<{ ok: boolean }>(`/api/reports/${id}/attachments`, { method: "POST", formData });
}

export async function requestReportAnalysis(id: string) {
  return apiClient<{ ok: boolean }>(`/api/reports/${id}/analyze`, { method: "POST" });
}
