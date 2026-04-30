export type ReportType = "LANE_STOP_REPORT" | "SHOULDER_STOP_REPORT" | "UNKNOWN_REPORT";
export type UploadPurpose = "REPORT" | "NORMAL_REFERENCE" | "TEST_DEMO";
export type AnalysisStatus = "WAITING" | "REQUESTED" | "ANALYZING" | "COMPLETED" | "FAILED";

export type Report = {
  id: string;
  title: string;
  reportType: ReportType;
  purpose: UploadPurpose;
  location: string;
  cctvId?: string;
  analysisStatus: AnalysisStatus;
  createdAt: string;
  attachmentName: string;
};
