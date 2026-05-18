export type LlmReportType = "INCIDENT_SUMMARY" | "INCIDENT_REPORT";
export type LlmGenerationStatus = "PENDING" | "GENERATING" | "DRAFT" | "EDITED" | "CONFIRMED" | "FAILED" | "DELETED";
export type LlmReportStatus = "PENDING" | "GENERATING" | "DRAFT" | "EDITED" | "CONFIRMED" | "FAILED" | "DELETED";
export type LlmTrainingPurpose = "REPORT" | "CHATBOT" | "RISK_SUMMARY" | "ALERT";
export type LlmTrainingDatasetStatus = "READY" | "BUILDING" | "VALIDATING" | "ARCHIVED" | "FAILED";

export type LlmTrainingSummary = {
  totalSampleCount: number;
  latestCreatedAt: string;
  trainingVersion: string;
  modelStatus: "READY" | "FALLBACK" | "MAINTENANCE";
};

export type LlmTrainingDataset = {
  id: string;
  datasetName: string;
  purpose: LlmTrainingPurpose;
  sampleCount: number;
  version: string;
  status: LlmTrainingDatasetStatus;
  createdAt: string;
};

export type LlmModelMetadata = {
  provider: string;
  modelName: string;
  promptVersion: string;
  fallbackEnabled: boolean;
};

export type LlmReport = {
  id: string;
  incidentId: string;
  incidentCode: string;
  reportTitle: string;
  reportType: LlmReportType;
  generationStatus: LlmGenerationStatus;
  reportStatus?: LlmReportStatus;
  llmProvider: string;
  llmModel: string;
  generatedBy: string;
  generatedAt: string;
  draft: string;
  summary?: string;
  reportContent?: string;
  verified: boolean;
  updatedAt: string;
  sections: {
    overview: string;
    location: string;
    aiDetection: string;
    riskAssessment: string;
    currentStatus: string;
    requiredActions: string;
  };
};

export type GenerateLlmReportRequest = {
  report_type?: LlmReportType;
  prompt_version?: string;
  llm_provider?: string;
};

export type UpdateLlmReportRequest = {
  report_title?: string;
  summary?: string;
  report_content?: string;
};
