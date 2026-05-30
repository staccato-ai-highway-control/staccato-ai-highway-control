import { apiClient } from "@/lib/apiClient";
import type { RecentIncidentEventsApiResponse, RealtimeEventPreview, RealtimeEventPreviewApiResponse, RealtimeIncidentEvent } from "./types";

function normalizeRecentIncidentEvents(response: RecentIncidentEventsApiResponse): RealtimeIncidentEvent[] {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response.events)) return response.events;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.incidents)) return response.incidents;

  const data = response.data;

  if (Array.isArray(data)) return data;

  if (data && Array.isArray(data.events)) return data.events;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.incidents)) return data.incidents;

  return [];
}

export async function fetchRecentIncidentEvents(limit = 30): Promise<RealtimeIncidentEvent[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await apiClient<RecentIncidentEventsApiResponse>(`/api/realtime/incidents/recent?${params.toString()}`);

  return normalizeRecentIncidentEvents(response);
}

function normalizeRealtimeEventPreviews(response: RealtimeEventPreviewApiResponse): RealtimeEventPreview[] {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.events)) return response.events;

  const data = response.data;

  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.events)) return data.events;

  return [];
}

export async function getRealtimeEventPreviews(limit = 5): Promise<RealtimeEventPreview[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await apiClient<RealtimeEventPreviewApiResponse>("/api/realtime/events/preview?" + params.toString(), { auth: false });

  return normalizeRealtimeEventPreviews(response);
}
