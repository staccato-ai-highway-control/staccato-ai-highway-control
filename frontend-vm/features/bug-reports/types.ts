export type BugReportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | string;
export type BugReportSeverity = "MINOR" | "MAJOR" | "CRITICAL" | string;
export type BugReportPriority = "LOW" | "MEDIUM" | "HIGH" | string;

export interface BugReportAttachment {
  id: number | string;
  bug_report_id?: number | string;
  original_filename?: string | null;
  filename?: string | null;
  mime_type?: string | null;
  file_type?: string | null;
  download_url?: string | null;
  created_at?: string | null;
  uploaded_at?: string | null;
}

export interface BugReportAllowedActions {
  update?: boolean;
  close?: boolean;
  upload_attachment?: boolean;
  edit?: boolean;
  delete?: boolean;
}

export interface BugReport {
  id: number | string;
  reporter_id?: number | string | null;
  author_id?: number | string | null;
  user_id?: number | string | null;
  allowed_actions?: BugReportAllowedActions | null;
  title: string;
  description?: string;
  category?: string;
  severity?: BugReportSeverity;
  priority?: BugReportPriority;
  status?: BugReportStatus;
  page_url?: string;
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
  browser?: string;
  os?: string;
  device?: string;
  app_version?: string;
  attachments?: BugReportAttachment[];
  attachment_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type BugReportDetail = BugReport;

export interface BugReportCreateRequest {
  title: string;
  description: string;
  category?: string;
  severity?: string;
  priority?: string;
  page_url?: string;
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
  browser?: string;
  os?: string;
  device?: string;
  app_version?: string;
}

export type BugReportUpdateRequest = Partial<BugReportCreateRequest> & {
  status?: BugReportStatus | string;
};

export interface BugReportListParams {
  page?: number;
  size?: number;
  status?: string;
  severity?: string;
  category?: string;
  keyword?: string;
}

export interface BugReportListResponse {
  items: BugReport[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
}

export interface BugReportAttachmentUploadResponse {
  success?: boolean;
  message?: string;
  bug_report_id?: number | string;
  count?: number;
  items?: BugReportAttachment[];
  data?: {
    items?: BugReportAttachment[];
    count?: number;
  };
}
