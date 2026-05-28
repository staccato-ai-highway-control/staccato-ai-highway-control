export type BugReportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type BugReportSeverity = "MINOR" | "MAJOR" | "CRITICAL";
export type BugReportPriority = "LOW" | "MEDIUM" | "HIGH";

export interface BugReport {
  id: number;
  title: string;
  description?: string;
  category?: string;
  severity?: BugReportSeverity | string;
  priority?: BugReportPriority | string;
  status?: BugReportStatus | string;
  page_url?: string;
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
  browser?: string;
  os?: string;
  device?: string;
  app_version?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BugReportCreatePayload {
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

export interface BugReportListResponse {
  items: BugReport[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
}
