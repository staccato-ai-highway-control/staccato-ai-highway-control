import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import type { ReplayItem, ReplayListParams, ReplayListResponse } from "./types";

type RawReplayListResponse =
  | ReplayItem[]
  | FlexibleApiResponse<ReplayListResponse>
  | { items?: ReplayItem[]; page?: number; size?: number; total_count?: number; total_pages?: number };

function buildQuery(params: ReplayListParams = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeReplayList(response: RawReplayListResponse): ReplayListResponse {
  if (Array.isArray(response)) {
    return { items: response, page: 1, size: response.length, total_count: response.length, total_pages: 1 };
  }

  const data = getEnvelopeData<ReplayListResponse | ReplayItem[]>(response as FlexibleApiResponse<ReplayListResponse | ReplayItem[]>);
  if (Array.isArray(data)) {
    return { items: data, page: 1, size: data.length, total_count: data.length, total_pages: 1 };
  }

  return {
    items: data.items ?? [],
    page: data.page ?? 1,
    size: data.size ?? data.items?.length ?? 0,
    total_count: data.total_count ?? data.items?.length ?? 0,
    total_pages: data.total_pages ?? 0,
  };
}

export async function fetchReplays(params: ReplayListParams = {}) {
  const response = await apiClient<RawReplayListResponse>(`/api/replays${buildQuery(params)}`, { auth: false });
  return normalizeReplayList(response);
}

export async function fetchReplay(incidentId: string | number) {
  const response = await apiClient<FlexibleApiResponse<ReplayItem>>(`/api/replays/${incidentId}`, { auth: false });
  return getEnvelopeData<ReplayItem>(response);
}
