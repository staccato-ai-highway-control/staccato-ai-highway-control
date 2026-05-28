export type ReplaySourceType = "REPORT" | "STREAM" | "UNKNOWN" | string;
export type ReplayRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
export type ReplayStatus = "DETECTED" | "REVIEWING" | "RESOLVED" | "ASSIGNED" | "FALSE_POSITIVE" | "CLOSED" | string;

export type ReplayItem = {
  incident_id: number;
  incident_code: string;
  title: string;
  description: string | null;
  incident_type: string;
  incident_source_type?: string | null;
  source_type: ReplaySourceType;
  status: ReplayStatus;
  risk_level: ReplayRiskLevel;
  risk_score: number | null;
  detected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  cctv_id: number | string | null;
  cctv_name: string | null;
  road_name: string | null;
  location_name: string | null;
  report_id: number | string | null;
  attachment_id: number | string | null;
  analysis_job_id: number | string | null;
  snapshot_url: string | null;
  replay_url: string | null;
  media_type: string | null;
  has_snapshot: boolean;
  has_video: boolean;
  cctv?: {
    id: number | string | null;
    name: string | null;
    road_name: string | null;
    location_name: string | null;
  } | null;
  report?: {
    id: number | string | null;
    title: string | null;
    status: string | null;
  } | null;
  attachment?: {
    id: number | string | null;
    original_filename: string | null;
    mime_type: string | null;
    file_url: string | null;
  } | null;
};

export type ReplayListParams = {
  page?: number;
  size?: number;
  source_type?: string;
  incident_type?: string;
  risk_level?: string;
  status?: string;
  keyword?: string;
};

export type ReplayListResponse = {
  items: ReplayItem[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
};
