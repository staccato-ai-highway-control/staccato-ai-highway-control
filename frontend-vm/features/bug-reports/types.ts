/**
 * 파일 역할: 버그 신고 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type BugReportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | string;
// 코드 설명: BugReportSeverity 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type BugReportSeverity = "MINOR" | "MAJOR" | "CRITICAL" | string;
// 코드 설명: BugReportPriority 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type BugReportPriority = "LOW" | "MEDIUM" | "HIGH" | string;

// 코드 설명: BugReportAttachment 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface BugReportAttachment {
  // 코드 설명: id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  id: number | string;
  // 코드 설명: bug_report_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  bug_report_id?: number | string;
  // 코드 설명: original_filename 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  original_filename?: string | null;
  // 코드 설명: filename 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  filename?: string | null;
  // 코드 설명: mime_type 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  mime_type?: string | null;
  // 코드 설명: file_type 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  file_type?: string | null;
  // 코드 설명: download_url 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  download_url?: string | null;
  // 코드 설명: created_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  created_at?: string | null;
  // 코드 설명: uploaded_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  uploaded_at?: string | null;
}

// 코드 설명: BugReportAllowedActions 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface BugReportAllowedActions {
  // 코드 설명: update 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  update?: boolean;
  // 코드 설명: close 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  close?: boolean;
  // 코드 설명: upload_attachment 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  upload_attachment?: boolean;
  // 코드 설명: edit 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  edit?: boolean;
  // 코드 설명: delete 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  delete?: boolean;
}

// 코드 설명: BugReport 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface BugReport {
  // 코드 설명: id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  id: number | string;
  // 코드 설명: reporter_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  reporter_id?: number | string | null;
  // 코드 설명: author_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  author_id?: number | string | null;
  // 코드 설명: user_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  user_id?: number | string | null;
  // 코드 설명: allowed_actions 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  allowed_actions?: BugReportAllowedActions | null;
  // 코드 설명: title 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  title: string;
  // 코드 설명: description 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  description?: string;
  // 코드 설명: category 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  category?: string;
  // 코드 설명: severity 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  severity?: BugReportSeverity;
  // 코드 설명: priority 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  priority?: BugReportPriority;
  // 코드 설명: status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  status?: BugReportStatus;
  // 코드 설명: page_url 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  page_url?: string;
  // 코드 설명: steps_to_reproduce 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  steps_to_reproduce?: string;
  // 코드 설명: expected_result 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  expected_result?: string;
  // 코드 설명: actual_result 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  actual_result?: string;
  // 코드 설명: browser 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  browser?: string;
  // 코드 설명: os 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  os?: string;
  // 코드 설명: device 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  device?: string;
  // 코드 설명: app_version 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  app_version?: string;
  // 코드 설명: attachments 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachments?: BugReportAttachment[];
  // 코드 설명: attachment_count 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  attachment_count?: number;
  // 코드 설명: created_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  created_at?: string;
  // 코드 설명: updated_at 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  updated_at?: string;
}

// 코드 설명: BugReportDetail 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type BugReportDetail = BugReport;

// 코드 설명: BugReportCreateRequest 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface BugReportCreateRequest {
  // 코드 설명: title 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  title: string;
  // 코드 설명: description 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  description: string;
  // 코드 설명: category 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  category?: string;
  // 코드 설명: severity 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  severity?: string;
  // 코드 설명: priority 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  priority?: string;
  // 코드 설명: page_url 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  page_url?: string;
  // 코드 설명: steps_to_reproduce 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  steps_to_reproduce?: string;
  // 코드 설명: expected_result 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  expected_result?: string;
  // 코드 설명: actual_result 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  actual_result?: string;
  // 코드 설명: browser 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  browser?: string;
  // 코드 설명: os 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  os?: string;
  // 코드 설명: device 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  device?: string;
  // 코드 설명: app_version 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  app_version?: string;
}

// 코드 설명: BugReportUpdateRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type BugReportUpdateRequest = Partial<BugReportCreateRequest> & {
  status?: BugReportStatus | string;
};

// 코드 설명: BugReportListParams 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface BugReportListParams {
  // 코드 설명: page 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  page?: number;
  // 코드 설명: size 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  size?: number;
  // 코드 설명: status 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  status?: string;
  // 코드 설명: severity 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  severity?: string;
  // 코드 설명: category 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  category?: string;
  // 코드 설명: keyword 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  keyword?: string;
}

// 코드 설명: BugReportListResponse 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface BugReportListResponse {
  // 코드 설명: items 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  items: BugReport[];
  // 코드 설명: page 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  page: number;
  // 코드 설명: size 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  size: number;
  // 코드 설명: total_count 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  total_count: number;
  // 코드 설명: total_pages 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  total_pages: number;
}

// 코드 설명: BugReportAttachmentUploadResponse 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface BugReportAttachmentUploadResponse {
  // 코드 설명: success 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  success?: boolean;
  // 코드 설명: message 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  message?: string;
  // 코드 설명: bug_report_id 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  bug_report_id?: number | string;
  // 코드 설명: count 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  count?: number;
  // 코드 설명: items 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  items?: BugReportAttachment[];
  // 코드 설명: data 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  data?: {
    items?: BugReportAttachment[];
    count?: number;
  };
}
