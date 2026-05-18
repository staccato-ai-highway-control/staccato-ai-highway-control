import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import type { Incident, IncidentStatus } from "./types";

export type UploadIncidentPayload = {
  file: File;
  reportType?: string;
  title?: string;
  subject?: string;
  description?: string;
  fields?: Record<string, string | number | boolean | null | undefined>;
};

export type UploadIncidentResponse = {
  success?: boolean;
  report_id?: string | number;
  incident_id?: string | number;
  data?: unknown;
  message?: string;
};

type ListResponse = FlexibleApiResponse<Incident[]> | { incidents?: Incident[] };

export function getIncidentsHealth() {
  return apiClient("/api/incidents/health", { auth: false });
}

export async function getIncidents() {
  const response = await apiClient<ListResponse>("/api/incidents");
  if (Array.isArray(response)) return response;
  if ("incidents" in response && response.incidents) return response.incidents;
  return getEnvelopeData<Incident[]>(response as FlexibleApiResponse<Incident[]>);
}

export async function getIncident(id: string) {
  const response = await apiClient<FlexibleApiResponse<Incident>>('/api/incidents/' + id);
  return getEnvelopeData<Incident>(response);
}

export async function uploadIncident(payload: UploadIncidentPayload) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("report_type", payload.reportType ?? "ACCIDENT");
  formData.append("title", payload.title ?? payload.subject ?? "사고 신고");
  formData.append("subject", payload.subject ?? payload.title ?? "사고 신고");
  if (payload.description) formData.append("description", payload.description);

  Object.entries(payload.fields ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) formData.append(key, String(value));
  });

  return apiClient<UploadIncidentResponse>("/api/incidents", {
    method: "POST",
    formData,
  });
}

export async function updateIncidentStatus(id: string, status: IncidentStatus) {
  return apiClient<{ ok?: boolean; success?: boolean }>('/api/incidents/' + id + '/status', {
    method: "PATCH",
    body: { status },
  });
}
