import { apiClient } from "@/lib/apiClient";
import { mockIncidents } from "./mock";
import type { Incident, IncidentStatus } from "./types";

export type UploadIncidentPayload = {
  file: File;
  fields?: Record<string, string | number | boolean | null | undefined>;
};

export function getIncidentsHealth() {
  return apiClient("/api/incidents/health", { auth: false });
}

export async function getIncidents() {
  return mockIncidents;
}

export async function getIncident(id: string) {
  return mockIncidents.find((incident) => incident.id === id) ?? mockIncidents[0];
}

export async function uploadIncident(payload: UploadIncidentPayload) {
  const formData = new FormData();
  formData.append("file", payload.file);

  Object.entries(payload.fields ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) formData.append(key, String(value));
  });

  return apiClient<{ incident_id?: string | number; report_id?: string | number; data?: unknown; message?: string }>("/api/incidents", {
    method: "POST",
    formData,
  });
}

export async function updateIncidentStatus(id: string, status: IncidentStatus) {
  return apiClient<{ ok: boolean }>(`/api/incidents/${id}/status`, {
    method: "PUT",
    body: { status },
  });
}

export async function createIncidentLlmReport(id: string) {
  return apiClient<{ reportId: string }>(`/api/incidents/${id}/llm-report`, { method: "POST" });
}
