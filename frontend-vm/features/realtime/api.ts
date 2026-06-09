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
  let items: RealtimeEventPreview[] | undefined;
  if (Array.isArray(response)) items = response;
  else if (Array.isArray(response.items)) items = response.items;
  else if (Array.isArray(response.events)) items = response.events;
  else {
    const data = response.data;
    if (Array.isArray(data)) items = data;
    else if (data && Array.isArray(data.items)) items = data.items;
    else if (data && Array.isArray(data.events)) items = data.events;
  }

  if (!items) throw new Error("응답 형식 오류: 실시간 이벤트 배열이 없습니다.");
  const invalid = items.some((item) => !item || item.realtime_event_id === undefined || !item.event_type || !item.message);
  if (invalid) throw new Error("응답 형식 오류: 실시간 이벤트 필수 필드가 누락되었습니다.");
  return items;
}

export async function getRealtimeEventPreviews(limit = 5): Promise<RealtimeEventPreview[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await apiClient<RealtimeEventPreviewApiResponse>("/api/realtime/events/preview?" + params.toString());

  return normalizeRealtimeEventPreviews(response);
}
