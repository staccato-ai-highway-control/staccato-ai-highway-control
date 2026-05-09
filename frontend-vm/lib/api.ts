import { apiClient } from "./apiClient";
import type { LoginRequest, LoginResponse } from "@/features/auth/types";
import type { IncidentStatus } from "@/features/incidents/types";
import type { CreateReportPayload } from "@/features/reports/api";

export { apiClient };

/*
 * Frontend -> Flask Server
 * Flask Server -> AI Server
 * Flask Server -> ITS Server
 * Flask Server -> External LLM API
 * Flask Server -> DB Server
 */

export function login(payload: LoginRequest) {
  return apiClient<LoginResponse>("/api/auth/login", { method: "POST", body: payload });
}

export function getDashboardSummary() {
  return apiClient("/api/dashboard/summary");
}

export function getIncidents() {
  return apiClient("/api/incidents");
}

export function getIncidentDetail(id: string) {
  return apiClient(`/api/incidents/${id}`);
}

export function updateIncidentStatus(id: string, status: IncidentStatus) {
  return apiClient<{ ok: boolean }>(`/api/incidents/${id}/status`, { method: "PUT", body: { status } });
}

export function createReport(payload: CreateReportPayload) {
  return apiClient<{ id: string }>("/api/reports", { method: "POST", body: payload });
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
  return apiClient<{ reportId: string }>(`/api/incidents/${id}/llm-report`, { method: "POST" });
}

export function getLlmReport(id: string) {
  return apiClient(`/api/llm-reports/${id}`);
}

export function verifyLlmReport(id: string) {
  return apiClient<{ ok: boolean }>(`/api/llm-reports/${id}/verify`, { method: "POST" });
}
