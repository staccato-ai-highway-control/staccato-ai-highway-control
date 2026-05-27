export type ReportType = "GENERAL" | "ACCIDENT" | "LANE_STOP_REPORT" | "SHOULDER_STOP_REPORT" | "UNKNOWN_REPORT" | string;
export type UploadPurpose = "ANALYSIS" | "REPORT" | "NORMAL_REFERENCE" | "TEST_DEMO" | string;
export type AnalysisStatus = "WAITING" | "REQUESTED" | "ANALYZING" | "COMPLETED" | "FAILED" | string;
export type ReportProcessingStatus = "SUBMITTED" | "REVIEWING" | "ANALYZING" | "CONVERTED_TO_INCIDENT" | "REJECTED" | "DELETED" | string;
export type ReportPriority = "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "URGENT" | string;

export interface Report {
  id: number | string;
  report_code?: string;
  report_type?: string;
  upload_purpose?: string;
  title?: string;
  subject?: string;
  description?: string;
  reporter_id?: number;
  reporter_name?: string;
  reporter?: string;
  cctv_id?: number | string | null;
  status?: string;
  priority?: string;
  risk_level?: string | null;
  risk_score?: number | null;
  converted_incident_id?: number | string | null;
  submitted_at?: string | null;
  created_at?: string;
  updated_at?: string | null;
  location?: string;
  address?: string;
  place_name?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  analysis_status?: string;
  analysis_summary?: string | null;
  attachment_name?: string;
  attachment_type?: "image" | "video" | string;
  uploaded_at?: string;

  // Legacy aliases kept for existing backend variants during rollout.
  reportCode?: string;
  reportType?: string;
  purpose?: string;
  analysisStatus?: string;
  createdAt?: string;
  attachmentName?: string;
  attachmentType?: "image" | "video" | string;
  uploadedAt?: string;
  roadName?: string;
  locationName?: string;
  convertedIncidentCode?: string;
  analysisSummary?: string;
}

export interface ReportListParams {
  status?: string;
  keyword?: string;
  report_type?: string;
  priority?: string;
  risk_level?: string;
  cctv_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
  mine?: boolean;
}

export type MyReportListParams = Pick<ReportListParams, "status" | "keyword" | "report_type" | "priority" | "page" | "size">;

export interface PaginatedReports {
  items: Report[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
}

export interface UpdateReportPayload {
  report_type?: string;
  upload_purpose?: string;
  title?: string;
  subject?: string;
  description?: string;
  priority?: string;
  location?: string;
  address?: string;
  place_name?: string;
  latitude?: number;
  longitude?: number;
}

export type ReportUploadResponse = {
  success?: boolean;
  message?: string;
  report_code?: string;
  report_id?: number;
  id?: string | number;
  data?: {
    report_id?: number;
    id?: string | number;
    report_code?: string;
  };
};
