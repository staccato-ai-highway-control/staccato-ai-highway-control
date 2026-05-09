import { apiClient } from "@/lib/apiClient";
import { mockLlmReports } from "./mock";

export async function getLlmReport(id: string) {
  return mockLlmReports.find((report) => report.id === id) ?? mockLlmReports[0];
}

export async function saveLlmReport(id: string, draft: string) {
  return apiClient<{ ok: boolean }>(`/api/llm-reports/${id}`, { method: "PATCH", body: { draft } });
}

export async function verifyLlmReport(id: string) {
  return apiClient<{ ok: boolean }>(`/api/llm-reports/${id}/verify`, { method: "POST" });
}

