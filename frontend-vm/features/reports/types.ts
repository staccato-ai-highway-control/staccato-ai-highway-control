export type ReportType = "GENERAL" | "ACCIDENT" | "LANE_STOP_REPORT" | "SHOULDER_STOP_REPORT" | "UNKNOWN_REPORT" | string;
export type UploadPurpose = "ANALYSIS" | "REPORT" | "NORMAL_REFERENCE" | "TEST_DEMO" | string;
export type AnalysisStatus = "WAITING" | "REQUESTED" | "QUEUED" | "RUNNING" | "PROCESSING" | "ANALYZING" | "COMPLETED" | "FAILED" | "CANCELLED" | string;
export type ReportProcessingStatus = "SUBMITTED" | "REVIEWING" | "ANALYZING" | "CONVERTED_TO_INCIDENT" | "REJECTED" | "CLOSED" | "DELETED" | string;
export type ReportPriority = "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "URGENT" | string;

export interface ReportAttachment {
  id?: number | string;
  attachment_id?: number | string;
  original_filename?: string | null;
  filename?: string | null;
  mime_type?: string | null;
  file_type?: string | null;
  file_url?: string | null;
  preview_url?: string | null;
  download_url?: string | null;
  created_at?: string | null;
  uploaded_at?: string | null;
}

export interface ReportAnalysisJob {
  id?: number | string;
  analysis_job_id?: number | string;
  job_status?: string | null;
  status?: string | null;
  summary?: string | null;
  risk_level?: string | null;
  risk_score?: number | null;
  converted_incident_id?: number | string | null;
  retry_count?: number | null;
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ReportAnalysisStatus {
  report_id?: number | string;
  analysis_job_id?: number | string | null;
  analysis_status?: string;
  status?: string;
  analysis_summary?: string | null;
  summary?: string | null;
  latest_job?: ReportAnalysisJob | null;
  risk_level?: string | null;
  risk_score?: number | null;
  converted_incident_id?: number | string | null;
}

export interface ReportAnalysisRequestResponse {
  ok?: boolean;
  success?: boolean;
  message?: string;
  report_id?: number | string;
  job_id?: number | string;
  jobs?: ReportAnalysisJob[];
  data?: {
    report_id?: number | string;
    job_id?: number | string;
    jobs?: ReportAnalysisJob[];
  };
}

export interface ReportAnalysisComparisonCandidate extends ReportAnalysisJob {
  job_id?: number | string;
  report_id?: number | string;
  attachment_id?: number | string | null;
  engine_name?: string | null;
  model_name?: string | null;
  created_at?: string | null;
}

export interface ReportAnalysisComparisonCandidatesResult {
  items: ReportAnalysisComparisonCandidate[];
}

export interface ReportAnalysisComparisonMetric {
  key?: string;
  name?: string;
  label?: string;
  value?: string | number | null;
  values?: Record<string, string | number | null | undefined>;
  unit?: string | null;
  description?: string | null;
}

export interface ReportAnalysisComparisonResult {
  id?: number | string;
  comparison_id?: number | string;
  job_ids?: Array<number | string>;
  summary?: string | null;
  metrics?: ReportAnalysisComparisonMetric[] | Record<string, unknown>;
  items?: ReportAnalysisComparisonCandidate[];
  created_at?: string | null;
}

export interface ReportAllowedActions {
  update?: boolean;
  delete?: boolean;
  approve?: boolean;
  reject?: boolean;
  change_status?: boolean;
  request_analysis?: boolean;
  retry_analysis?: boolean;
  upload_attachment?: boolean;
  delete_attachment?: boolean;
}

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
  author_id?: number | string | null;
  allowed_actions?: ReportAllowedActions | null;
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
  analysis_job_id?: number | string | null;
  analysis_status?: string;
  analysis_summary?: string | null;
  analysis_jobs?: ReportAnalysisJob[];
  latest_job?: ReportAnalysisJob | null;
  attachment_name?: string;
  attachment_type?: "image" | "video" | string;
  uploaded_at?: string;
  attachments?: ReportAttachment[];
  attachment_count?: number;
  attachment_id?: number | string | null;
  preview_url?: string | null;
  thumbnail_url?: string | null;
  download_url?: string | null;

  // Legacy aliases kept for existing backend variants during rollout.
  reportCode?: string;
  reportType?: string;
  purpose?: string;
  analysisJobId?: number | string | null;
  analysisStatus?: string;
  analysisJobs?: ReportAnalysisJob[];
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

export interface UpdateReportStatusPayload {
  status: "SUBMITTED" | "REVIEWING" | "ANALYZING" | "CONVERTED_TO_INCIDENT" | "REJECTED" | "CLOSED" | string;
  reason?: string;
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

export interface ReportDraftPayload {
  title?: string;
  subject?: string;
  report_type?: string;
  upload_purpose?: string;
  description?: string;
  priority?: string;
  cctv_id?: number | string | null;
  latitude?: string | number;
  longitude?: string | number;
  location?: string;
  address?: string;
  place_name?: string;
}

export interface ReportDraft extends Report {
  draft_id?: number | string;
}

export interface PaginatedReportDrafts {
  items: ReportDraft[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
}

export type ReportDraftResponse = {
  success?: boolean;
  message?: string;
  draft_id?: number | string;
  draft?: ReportDraft;
  data?: ReportDraft;
};

export type ReportDraftSubmitResponse = {
  success?: boolean;
  message?: string;
  report_id?: number | string;
  report?: Report;
  data?: {
    report_id?: number | string;
    id?: number | string;
  };
};

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

// ─── 모델 비교 분석 타입 ────────────────────────────────────────────────────

export interface ModelComparisonModel {
  model_id: string;
  model_name?: string | null;
  model_version?: string | null;
  description?: string | null;
}

export type ModelComparisonBatchStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "PARTIAL_FAILED"
  | "FAILED"
  | string;

export type ModelComparisonRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | string;

export interface ModelComparisonItem {
  model_name: string;
  model_id?: string | null;
  model_version?: string | null;
  run_status: ModelComparisonRunStatus;
  detection_count?: number | null;
  avg_confidence?: number | null;
  inference_ms?: number | null;
  inference_fps?: number | null;
  total_elapsed_ms?: number | null;
  annotated_media_url?: string | null;
  error_message?: string | null;
}

export interface ModelComparisonBatchListItem {
  id: number | string;
  report_id?: number | string;
  report_code?: string | null;
  report_title?: string | null;
  batch_status?: ModelComparisonBatchStatus;
  status?: ModelComparisonBatchStatus;
  selected_model_count?: number | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  runs?: ModelComparisonItem[];
  run_summary?: { total?: number; by_status?: Record<string, number> };
}

export interface PaginatedModelComparisonBatches {
  batches: ModelComparisonBatchListItem[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
}

export interface ModelComparisonBatchResult {
  batch?: {
    id?: string | number;
    status?: ModelComparisonBatchStatus;
    batch_status?: ModelComparisonBatchStatus;
    runs?: ModelComparisonItem[];
    results?: ModelComparisonItem[];
  };
  status?: ModelComparisonBatchStatus;
  runs?: ModelComparisonItem[];
  results?: ModelComparisonItem[];
}
