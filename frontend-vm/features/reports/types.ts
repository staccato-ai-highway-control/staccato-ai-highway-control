export type ReportType = "LANE_STOP_REPORT" | "SHOULDER_STOP_REPORT" | "UNKNOWN_REPORT";
export type UploadPurpose = "REPORT" | "NORMAL_REFERENCE" | "TEST_DEMO";
export type AnalysisStatus = "WAITING" | "REQUESTED" | "ANALYZING" | "COMPLETED" | "FAILED";
export type ReportProcessingStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "ANALYZING"
  | "CONVERTED_TO_INCIDENT"
  | "REJECTED";
export type ReportPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

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
