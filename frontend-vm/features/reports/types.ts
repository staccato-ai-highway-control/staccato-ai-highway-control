/**
 * 파일 역할: 보고서 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type ReportType = "GENERAL" | "ACCIDENT" | "LANE_STOP_REPORT" | "SHOULDER_STOP_REPORT" | "UNKNOWN_REPORT" | string;
// 코드 설명: UploadPurpose 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type UploadPurpose = "ANALYSIS" | "REPORT" | "NORMAL_REFERENCE" | "TEST_DEMO" | string;
// 코드 설명: AnalysisStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type AnalysisStatus = "WAITING" | "REQUESTED" | "QUEUED" | "RUNNING" | "PROCESSING" | "ANALYZING" | "COMPLETED" | "FAILED" | "CANCELLED" | string;
// 코드 설명: ReportProcessingStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ReportProcessingStatus = "SUBMITTED" | "REVIEWING" | "ANALYZING" | "CONVERTED_TO_INCIDENT" | "REJECTED" | "CLOSED" | "DELETED" | string;
// 코드 설명: ReportPriority 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ReportPriority = "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "URGENT" | string;

// 코드 설명: ReportAttachment 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportAttachment {
  // 코드 설명: id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  id?: number | string;
  // 코드 설명: attachment_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachment_id?: number | string;
  // 코드 설명: original_filename 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  original_filename?: string | null;
  // 코드 설명: filename 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  filename?: string | null;
  // 코드 설명: mime_type 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  mime_type?: string | null;
  // 코드 설명: file_type 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  file_type?: string | null;
  // 코드 설명: file_url 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  file_url?: string | null;
  // 코드 설명: preview_url 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  preview_url?: string | null;
  // 코드 설명: download_url 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  download_url?: string | null;
  // 코드 설명: created_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  created_at?: string | null;
  // 코드 설명: uploaded_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  uploaded_at?: string | null;
}

// 코드 설명: ReportAnalysisJob 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportAnalysisJob {
  // 코드 설명: id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  id?: number | string;
  // 코드 설명: analysis_job_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysis_job_id?: number | string;
  // 코드 설명: job_status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  job_status?: string | null;
  // 코드 설명: status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  status?: string | null;
  // 코드 설명: summary 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  summary?: string | null;
  // 코드 설명: risk_level 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  risk_level?: string | null;
  // 코드 설명: risk_score 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  risk_score?: number | null;
  // 코드 설명: converted_incident_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  converted_incident_id?: number | string | null;
  // 코드 설명: retry_count 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  retry_count?: number | null;
  // 코드 설명: error_message 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  error_message?: string | null;
  // 코드 설명: created_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  created_at?: string | null;
  // 코드 설명: updated_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  updated_at?: string | null;
}

// 코드 설명: ReportAnalysisStatus 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportAnalysisStatus {
  // 코드 설명: report_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  report_id?: number | string;
  // 코드 설명: analysis_job_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysis_job_id?: number | string | null;
  // 코드 설명: analysis_status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysis_status?: string;
  // 코드 설명: status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  status?: string;
  // 코드 설명: analysis_summary 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysis_summary?: string | null;
  // 코드 설명: summary 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  summary?: string | null;
  // 코드 설명: latest_job 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  latest_job?: ReportAnalysisJob | null;
  // 코드 설명: risk_level 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  risk_level?: string | null;
  // 코드 설명: risk_score 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  risk_score?: number | null;
  // 코드 설명: converted_incident_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  converted_incident_id?: number | string | null;
}

// 코드 설명: ReportAnalysisRequestResponse 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportAnalysisRequestResponse {
  // 코드 설명: ok 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  ok?: boolean;
  // 코드 설명: success 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  success?: boolean;
  // 코드 설명: message 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  message?: string;
  // 코드 설명: report_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  report_id?: number | string;
  // 코드 설명: job_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  job_id?: number | string;
  // 코드 설명: jobs 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  jobs?: ReportAnalysisJob[];
  // 코드 설명: data 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  data?: {
    report_id?: number | string;
    job_id?: number | string;
    jobs?: ReportAnalysisJob[];
  };
}

// 코드 설명: ReportAnalysisComparisonCandidate 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportAnalysisComparisonCandidate extends ReportAnalysisJob {
  // 코드 설명: job_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  job_id?: number | string;
  // 코드 설명: report_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  report_id?: number | string;
  // 코드 설명: attachment_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachment_id?: number | string | null;
  // 코드 설명: engine_name 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  engine_name?: string | null;
  // 코드 설명: model_name 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  model_name?: string | null;
  // 코드 설명: created_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  created_at?: string | null;
}

// 코드 설명: ReportAnalysisComparisonCandidatesResult 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportAnalysisComparisonCandidatesResult {
  // 코드 설명: items 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  items: ReportAnalysisComparisonCandidate[];
}

// 코드 설명: ReportAnalysisComparisonMetric 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportAnalysisComparisonMetric {
  // 코드 설명: key 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  key?: string;
  // 코드 설명: name 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  name?: string;
  // 코드 설명: label 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  label?: string;
  // 코드 설명: value 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  value?: string | number | null;
  // 코드 설명: values 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  values?: Record<string, string | number | null | undefined>;
  // 코드 설명: unit 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  unit?: string | null;
  // 코드 설명: description 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  description?: string | null;
}

// 코드 설명: ReportAnalysisComparisonResult 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportAnalysisComparisonResult {
  // 코드 설명: id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  id?: number | string;
  // 코드 설명: comparison_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  comparison_id?: number | string;
  // 코드 설명: job_ids 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  job_ids?: Array<number | string>;
  // 코드 설명: summary 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  summary?: string | null;
  // 코드 설명: metrics 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  metrics?: ReportAnalysisComparisonMetric[] | Record<string, unknown>;
  // 코드 설명: items 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  items?: ReportAnalysisComparisonCandidate[];
  // 코드 설명: created_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  created_at?: string | null;
}

// 코드 설명: ReportAllowedActions 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportAllowedActions {
  // 코드 설명: update 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  update?: boolean;
  // 코드 설명: delete 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  delete?: boolean;
  // 코드 설명: approve 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  approve?: boolean;
  // 코드 설명: reject 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  reject?: boolean;
  // 코드 설명: change_status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  change_status?: boolean;
  // 코드 설명: request_analysis 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  request_analysis?: boolean;
  // 코드 설명: retry_analysis 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  retry_analysis?: boolean;
  // 코드 설명: upload_attachment 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  upload_attachment?: boolean;
  // 코드 설명: delete_attachment 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  delete_attachment?: boolean;
}

// 코드 설명: Report 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface Report {
  // 코드 설명: id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  id: number | string;
  // 코드 설명: report_code 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  report_code?: string;
  // 코드 설명: report_type 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  report_type?: string;
  // 코드 설명: upload_purpose 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  upload_purpose?: string;
  // 코드 설명: title 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  title?: string;
  // 코드 설명: subject 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  subject?: string;
  // 코드 설명: description 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  description?: string;
  // 코드 설명: reporter_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  reporter_id?: number;
  // 코드 설명: reporter_name 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  reporter_name?: string;
  // 코드 설명: reporter 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  reporter?: string;
  // 코드 설명: author_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  author_id?: number | string | null;
  // 코드 설명: allowed_actions 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  allowed_actions?: ReportAllowedActions | null;
  // 코드 설명: cctv_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  cctv_id?: number | string | null;
  // 코드 설명: status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  status?: string;
  // 코드 설명: priority 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  priority?: string;
  // 코드 설명: risk_level 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  risk_level?: string | null;
  // 코드 설명: risk_score 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  risk_score?: number | null;
  // 코드 설명: converted_incident_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  converted_incident_id?: number | string | null;
  // 코드 설명: submitted_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  submitted_at?: string | null;
  // 코드 설명: created_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  created_at?: string;
  // 코드 설명: updated_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  updated_at?: string | null;
  // 코드 설명: location 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  location?: string;
  // 코드 설명: address 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  address?: string;
  // 코드 설명: place_name 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  place_name?: string;
  // 코드 설명: latitude 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  latitude?: number | string | null;
  // 코드 설명: longitude 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  longitude?: number | string | null;
  // 코드 설명: analysis_job_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysis_job_id?: number | string | null;
  // 코드 설명: analysis_status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysis_status?: string;
  // 코드 설명: analysis_summary 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysis_summary?: string | null;
  // 코드 설명: analysis_jobs 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysis_jobs?: ReportAnalysisJob[];
  // 코드 설명: latest_job 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  latest_job?: ReportAnalysisJob | null;
  // 코드 설명: attachment_name 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachment_name?: string;
  // 코드 설명: attachment_type 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachment_type?: "image" | "video" | string;
  // 코드 설명: uploaded_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  uploaded_at?: string;
  // 코드 설명: attachments 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachments?: ReportAttachment[];
  // 코드 설명: attachment_count 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachment_count?: number;
  // 코드 설명: attachment_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachment_id?: number | string | null;
  // 코드 설명: preview_url 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  preview_url?: string | null;
  // 코드 설명: thumbnail_url 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  thumbnail_url?: string | null;
  // 코드 설명: download_url 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  download_url?: string | null;

  // Legacy aliases kept for existing backend variants during rollout.
  reportCode?: string;
  // 코드 설명: reportType 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  reportType?: string;
  // 코드 설명: purpose 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  purpose?: string;
  // 코드 설명: analysisJobId 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysisJobId?: number | string | null;
  // 코드 설명: analysisStatus 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysisStatus?: string;
  // 코드 설명: analysisJobs 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysisJobs?: ReportAnalysisJob[];
  // 코드 설명: createdAt 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  createdAt?: string;
  // 코드 설명: attachmentName 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachmentName?: string;
  // 코드 설명: attachmentType 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachmentType?: "image" | "video" | string;
  // 코드 설명: uploadedAt 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  uploadedAt?: string;
  // 코드 설명: roadName 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  roadName?: string;
  // 코드 설명: locationName 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  locationName?: string;
  // 코드 설명: convertedIncidentCode 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  convertedIncidentCode?: string;
  // 코드 설명: analysisSummary 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  analysisSummary?: string;
}

// 코드 설명: ReportListParams 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportListParams {
  // 코드 설명: status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  status?: string;
  // 코드 설명: keyword 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  keyword?: string;
  // 코드 설명: report_type 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  report_type?: string;
  // 코드 설명: priority 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  priority?: string;
  // 코드 설명: risk_level 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  risk_level?: string;
  // 코드 설명: cctv_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  cctv_id?: number;
  // 코드 설명: start_date 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  start_date?: string;
  // 코드 설명: end_date 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  end_date?: string;
  // 코드 설명: page 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  page?: number;
  // 코드 설명: size 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  size?: number;
  // 코드 설명: mine 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  mine?: boolean;
}

// 코드 설명: MyReportListParams 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type MyReportListParams = Pick<ReportListParams, "status" | "keyword" | "report_type" | "priority" | "page" | "size">;

// 코드 설명: PaginatedReports 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface PaginatedReports {
  // 코드 설명: items 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  items: Report[];
  // 코드 설명: page 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  page: number;
  // 코드 설명: size 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  size: number;
  // 코드 설명: total_count 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  total_count: number;
  // 코드 설명: total_pages 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  total_pages: number;
}

// 코드 설명: UpdateReportStatusPayload 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface UpdateReportStatusPayload {
  // 코드 설명: status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  status: "SUBMITTED" | "REVIEWING" | "ANALYZING" | "CONVERTED_TO_INCIDENT" | "REJECTED" | "CLOSED" | string;
  // 코드 설명: reason 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  reason?: string;
}

// 코드 설명: UpdateReportPayload 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface UpdateReportPayload {
  // 코드 설명: report_type 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  report_type?: string;
  // 코드 설명: upload_purpose 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  upload_purpose?: string;
  // 코드 설명: title 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  title?: string;
  // 코드 설명: subject 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  subject?: string;
  // 코드 설명: description 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  description?: string;
  // 코드 설명: priority 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  priority?: string;
  // 코드 설명: location 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  location?: string;
  // 코드 설명: address 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  address?: string;
  // 코드 설명: place_name 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  place_name?: string;
  // 코드 설명: latitude 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  latitude?: number;
  // 코드 설명: longitude 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  longitude?: number;
}

// 코드 설명: ReportDraftPayload 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportDraftPayload {
  // 코드 설명: title 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  title?: string;
  // 코드 설명: subject 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  subject?: string;
  // 코드 설명: report_type 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  report_type?: string;
  // 코드 설명: upload_purpose 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  upload_purpose?: string;
  // 코드 설명: description 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  description?: string;
  // 코드 설명: priority 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  priority?: string;
  // 코드 설명: cctv_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  cctv_id?: number | string | null;
  // 코드 설명: latitude 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  latitude?: string | number;
  // 코드 설명: longitude 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  longitude?: string | number;
  // 코드 설명: location 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  location?: string;
  // 코드 설명: address 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  address?: string;
  // 코드 설명: place_name 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  place_name?: string;
}

// 코드 설명: ReportDraft 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface ReportDraft extends Report {
  // 코드 설명: draft_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  draft_id?: number | string;
}

// 코드 설명: PaginatedReportDrafts 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface PaginatedReportDrafts {
  // 코드 설명: items 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  items: ReportDraft[];
  // 코드 설명: page 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  page: number;
  // 코드 설명: size 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  size: number;
  // 코드 설명: total_count 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  total_count: number;
  // 코드 설명: total_pages 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  total_pages: number;
}

// 코드 설명: ReportDraftResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ReportDraftResponse = {
  success?: boolean;
  message?: string;
  draft_id?: number | string;
  draft?: ReportDraft;
  data?: ReportDraft;
};

// 코드 설명: ReportDraftSubmitResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
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

// 코드 설명: ReportUploadResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
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
