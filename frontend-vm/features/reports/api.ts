import { apiClient } from "@/lib/apiClient";
import { mockReports } from "./mock";
import type { ReportType, UploadPurpose } from "./types";

export type CreateReportPayload = {
  title: string;
  reportType: ReportType;
  purpose: UploadPurpose;
  description?: string;
  location?: string;
  cctvId?: string;
};

export async function getReports() {
  return mockReports;
}

export async function getReport(id: string) {
  return mockReports.find((report) => report.id === id) ?? mockReports[0];
}

export async function createReport(payload: CreateReportPayload) {
  return apiClient<{ id: string }>("/api/reports", { method: "POST", body: payload });
}

export async function uploadReportAttachment(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiClient<{ ok: boolean }>(`/api/reports/${id}/attachments`, { method: "POST", formData });
}

export async function requestReportAnalysis(id: string) {
  return apiClient<{ ok: boolean }>(`/api/reports/${id}/analyze`, { method: "POST" });
}
