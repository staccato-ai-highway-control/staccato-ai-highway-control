import { apiClient } from "./apiClient";
import type { IncidentStatus } from "@/features/incidents/types";
import type { LoginRequest, LoginResponse } from "@/features/auth/types";
import { login } from "@/features/auth/api";
import { uploadReport, type UploadReportPayload } from "@/features/reports/api";

export { apiClient, login };

export type ReportPayload = UploadReportPayload;

export function fetchDashboardSummary() {
  return apiClient("/api/dashboard/summary");
}

export function fetchIncidents() {
  return apiClient("/api/incidents");
}

export function fetchIncident(id: string) {
  return apiClient(`/api/incidents/${id}`);
}

export function updateIncidentStatus(id: string, status: IncidentStatus) {
  return apiClient<{ ok: boolean }>(`/api/incidents/${id}/status`, { method: "PUT", body: { status } });
}

export function createReport(payload: UploadReportPayload) {
  return uploadReport(payload);
}

export function uploadReportAttachment(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient<{ ok: boolean }>(`/api/reports/${id}/attachments`, { method: "POST", formData });
}

export function requestReportAnalysis(id: string) {
  return apiClient<{ ok: boolean }>(`/api/reports/${id}/analyze`, { method: "POST" });
}

export function generateLlmReport(id: string) {
  return apiClient<{ reportId?: string; id?: string }>("/incidents/" + id + "/llm-reports", {
    method: "POST",
    body: { report_type: "INCIDENT_REPORT", prompt_version: "v1", llm_provider: "LOCAL_LLM" },
  });
}

export function fetchLlmReport(id: string) {
  return apiClient("/llm-reports/" + id);
}

export function verifyLlmReport(id: string) {
  return apiClient<{ ok?: boolean; success?: boolean }>("/llm-reports/" + id + "/confirm", { method: "POST" });
}

export type { LoginRequest, LoginResponse };
