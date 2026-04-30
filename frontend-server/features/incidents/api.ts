import { apiClient } from "@/lib/apiClient";
import { mockIncidents } from "./mock";
import type { Incident, IncidentStatus } from "./types";

export async function getIncidents() {
  return mockIncidents;
}

export async function getIncident(id: string) {
  return mockIncidents.find((incident) => incident.id === id) ?? mockIncidents[0];
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
