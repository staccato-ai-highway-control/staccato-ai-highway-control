import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import type { GenerateLlmReportRequest, LlmReport, UpdateLlmReportRequest } from "./types";

type RawLlmReport = Partial<LlmReport> & {
  id?: string | number;
  report_id?: string | number;
  incident_id?: string | number;
  incident_code?: string;
  report_title?: string;
  report_type?: LlmReport["reportType"];
  generation_status?: LlmReport["generationStatus"];
  report_status?: LlmReport["generationStatus"];
  llm_provider?: string;
  llm_model?: string;
  generated_by?: string;
  generated_at?: string;
  report_content?: string;
  updated_at?: string;
};

type ListResponse = FlexibleApiResponse<RawLlmReport[]> | { reports?: RawLlmReport[]; llm_reports?: RawLlmReport[] };

function normalizeReport(raw: RawLlmReport): LlmReport {
  const content = raw.reportContent ?? raw.report_content ?? raw.draft ?? "";
  const status = raw.generationStatus ?? raw.generation_status ?? raw.reportStatus ?? raw.report_status ?? "DRAFT";

  return {
    id: String(raw.id ?? raw.report_id ?? ""),
    incidentId: String(raw.incidentId ?? raw.incident_id ?? ""),
    incidentCode: raw.incidentCode ?? raw.incident_code ?? "-",
    reportTitle: raw.reportTitle ?? raw.report_title ?? "LLM 보고서",
    reportType: raw.reportType ?? raw.report_type ?? "INCIDENT_REPORT",
    generationStatus: status,
    reportStatus: raw.reportStatus ?? raw.report_status,
    llmProvider: raw.llmProvider ?? raw.llm_provider ?? "LOCAL_LLM",
    llmModel: raw.llmModel ?? raw.llm_model ?? "-",
    generatedBy: raw.generatedBy ?? raw.generated_by ?? "-",
    generatedAt: raw.generatedAt ?? raw.generated_at ?? "-",
    draft: content,
    summary: raw.summary,
    reportContent: content,
    verified: raw.verified ?? status === "CONFIRMED",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? "-",
    sections: raw.sections ?? {
      overview: raw.summary ?? content,
      location: "-",
      aiDetection: "-",
      riskAssessment: "-",
      currentStatus: String(status),
      requiredActions: "-",
    },
  };
}

function normalizeList(response: ListResponse) {
  if (Array.isArray(response)) return response.map(normalizeReport);
  if ("reports" in response && response.reports) return response.reports.map(normalizeReport);
  if ("llm_reports" in response && response.llm_reports) return response.llm_reports.map(normalizeReport);
  return getEnvelopeData<RawLlmReport[]>(response as FlexibleApiResponse<RawLlmReport[]>).map(normalizeReport);
}

export async function createIncidentLlmReport(incidentId: string | number, payload: GenerateLlmReportRequest = {}) {
  const response = await apiClient<FlexibleApiResponse<RawLlmReport>>('/incidents/' + incidentId + '/llm-reports', {
    method: "POST",
    body: {
      report_type: payload.report_type ?? "INCIDENT_REPORT",
      prompt_version: payload.prompt_version ?? "v1",
      llm_provider: payload.llm_provider ?? "LOCAL_LLM",
    },
  });
  return normalizeReport(getEnvelopeData<RawLlmReport>(response));
}

export async function getIncidentLlmReports(incidentId: string | number) {
  return normalizeList(await apiClient<ListResponse>('/incidents/' + incidentId + '/llm-reports'));
}

export async function getLlmReports() {
  return normalizeList(await apiClient<ListResponse>("/llm-reports"));
}

export async function getLlmReport(id: string | number) {
  const response = await apiClient<FlexibleApiResponse<RawLlmReport>>('/llm-reports/' + id);
  return normalizeReport(getEnvelopeData<RawLlmReport>(response));
}

export async function updateLlmReport(id: string | number, payload: UpdateLlmReportRequest) {
  const response = await apiClient<FlexibleApiResponse<RawLlmReport>>('/llm-reports/' + id, {
    method: "PATCH",
    body: payload,
  });
  return normalizeReport(getEnvelopeData<RawLlmReport>(response));
}

export async function saveLlmReport(id: string | number, draft: string) {
  return updateLlmReport(id, { report_content: draft });
}

export async function confirmLlmReport(id: string | number) {
  return apiClient('/llm-reports/' + id + '/confirm', { method: "POST" });
}

export async function verifyLlmReport(id: string | number) {
  return confirmLlmReport(id);
}

export async function regenerateLlmReport(id: string | number) {
  const response = await apiClient<FlexibleApiResponse<RawLlmReport>>('/llm-reports/' + id + '/regenerate', { method: "POST" });
  return normalizeReport(getEnvelopeData<RawLlmReport>(response));
}

export async function deleteLlmReport(id: string | number) {
  return apiClient('/llm-reports/' + id, { method: "DELETE" });
}
