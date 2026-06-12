/**
 * 파일 역할: 영상 재생 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type ReplaySourceType = "REPORT" | "STREAM" | "UNKNOWN" | string;
// 코드 설명: ReplayRiskLevel 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ReplayRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
// 코드 설명: ReplayStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ReplayStatus = "DETECTED" | "REVIEWING" | "RESOLVED" | "ASSIGNED" | "FALSE_POSITIVE" | "CLOSED" | string;

// 코드 설명: ReplayItem 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
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

// 코드 설명: ReplayListParams 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ReplayListParams = {
  page?: number;
  size?: number;
  source_type?: string;
  incident_type?: string;
  risk_level?: string;
  status?: string;
  keyword?: string;
};

// 코드 설명: ReplayListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ReplayListResponse = {
  items: ReplayItem[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
};
