import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import type { BugReport, BugReportCreatePayload, BugReportListResponse } from "./types";

type BugReportListParams = {
  page?: number;
  size?: number;
  status?: string;
  severity?: string;
  category?: string;
  keyword?: string;
};

type RawBugReportListResponse =
  | BugReport[]
  | FlexibleApiResponse<BugReportListResponse>
  | { items?: BugReport[]; page?: number; size?: number; total_count?: number; total_pages?: number };

type BugReportCreateResponse = FlexibleApiResponse<BugReport | { id: number }>;

function buildQuery(params: BugReportListParams = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeBugReportList(response: RawBugReportListResponse): BugReportListResponse {
  if (Array.isArray(response)) {
    return { items: response, page: 1, size: response.length, total_count: response.length, total_pages: 1 };
  }

  const data = getEnvelopeData<BugReportListResponse | BugReport[]>(response as FlexibleApiResponse<BugReportListResponse | BugReport[]>);

  if (Array.isArray(data)) {
    return { items: data, page: 1, size: data.length, total_count: data.length, total_pages: 1 };
  }

  return {
    items: data.items ?? [],
    page: data.page ?? 1,
    size: data.size ?? data.items?.length ?? 0,
    total_count: data.total_count ?? data.items?.length ?? 0,
    total_pages: data.total_pages ?? 1,
  };
}

export async function fetchBugReports(params: BugReportListParams = {}): Promise<BugReportListResponse> {
  const response = await apiClient<RawBugReportListResponse>(`/api/bug-reports${buildQuery(params)}`, { auth: false });
  const list = normalizeBugReportList(response);

  return {
    ...list,
    items: [...list.items].sort((a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime()),
  };
}

export async function fetchBugReport(id: number): Promise<BugReport> {
  const response = await apiClient<FlexibleApiResponse<BugReport>>(`/api/bug-reports/${id}`, { auth: false });
  return getEnvelopeData<BugReport>(response);
}

export async function createBugReport(payload: BugReportCreatePayload): Promise<BugReport> {
  const response = await apiClient<BugReportCreateResponse>("/api/bug-reports", {
    method: "POST",
    auth: false,
    body: payload,
  });

  return getEnvelopeData<BugReport | { id: number }>(response) as BugReport;
}
