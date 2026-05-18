export type ReportType = "GENERAL" | "ACCIDENT" | "LANE_STOP_REPORT" | "SHOULDER_STOP_REPORT" | "UNKNOWN_REPORT";
export type UploadPurpose = "ANALYSIS" | "REPORT" | "NORMAL_REFERENCE" | "TEST_DEMO";
export type AnalysisStatus = "WAITING" | "REQUESTED" | "ANALYZING" | "COMPLETED" | "FAILED";
export type ReportProcessingStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "ANALYZING"
  | "CONVERTED_TO_INCIDENT"
  | "REJECTED";
export type ReportPriority = "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "URGENT";

export type Report = {
  id: string;
  reportCode: string;
  title: string;
  reportType: ReportType;
  purpose: UploadPurpose;
  reporter: string;
  location: string;
  cctvId?: string;
  analysisStatus: AnalysisStatus;
  status: ReportProcessingStatus;
  priority: ReportPriority;
  createdAt: string;
  attachmentName: string;
  attachmentType?: "image" | "video";
  uploadedAt?: string;
  roadName?: string;
  locationName?: string;
  convertedIncidentCode?: string;
  analysisSummary?: string;
};

export type ReportUploadResponse = {
  message?: string;
  report_code?: string;
  report_id?: number;
  id?: string | number;
};
