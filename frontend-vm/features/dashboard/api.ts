import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";

export interface DashboardSummaryResponse {
  success: boolean;
  data: {
    users: {
      total: number | null;
      pending_signup: number | null;
    };
    notifications: {
      unread_count: number;
    };
  };
}

export type DashboardSummary = DashboardSummaryResponse["data"];

export async function getDashboardSummary() {
  const response = await apiClient<FlexibleApiResponse<DashboardSummary>>("/api/dashboard/summary");
  return getEnvelopeData<DashboardSummary>(response);
}
