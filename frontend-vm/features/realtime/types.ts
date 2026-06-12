/**
 * 파일 역할: 실시간 이벤트 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type RealtimeIncidentEvent = {
  realtime_event_id?: number | string;
  id?: number | string;
  send_status?: string;
  created_at?: string;
  sent_at?: string | null;

  incident_id?: number | string | null;
  incident_code?: string | null;
  event_type?: string | null;
  severity?: string | null;
  incident_status?: string | null;

  cctv_id?: number | string | null;
  source_cctv_id?: number | string | null;
  detection_log_id?: number | string | null;
  occurred_at?: string | null;

  message?: string | null;
  vehicle_class?: string | null;
  track_id?: number | string | null;
  roi_type?: string | null;
  confidence?: number | string | null;

  snapshot_path?: string | null;
  clip_path?: string | null;
};

// 코드 설명: RecentIncidentEventsApiResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type RecentIncidentEventsApiResponse =
  | RealtimeIncidentEvent[]
  | {
      data?:
        | RealtimeIncidentEvent[]
        | {
            events?: RealtimeIncidentEvent[];
            items?: RealtimeIncidentEvent[];
            incidents?: RealtimeIncidentEvent[];
          };
      events?: RealtimeIncidentEvent[];
      items?: RealtimeIncidentEvent[];
      incidents?: RealtimeIncidentEvent[];
    };

// 코드 설명: RealtimeConnectionStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

// 코드 설명: RealtimeBboxMetadata 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type RealtimeBboxMetadata = {
  frame_width?: number;
  frame_height?: number;
  bbox_format?: "xyxy" | "xywh" | string;
  detections?: Array<Record<string, unknown>>;
};

// 코드 설명: RealtimeEventPreview 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type RealtimeEventPreview = {
  realtime_event_id: number | string;
  event_type: string;
  message: string;
  severity?: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  source_cctv_id?: string | number | null;
  preview_url?: string | null;
  preview_type?: "video" | "image" | string | null;
  video_url?: string | null;
  snapshot_url?: string | null;
  target_url?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
  has_video?: boolean;
  has_snapshot?: boolean;
  bbox_metadata?: RealtimeBboxMetadata | null;
};

// 코드 설명: RealtimeEventPreviewApiResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type RealtimeEventPreviewApiResponse =
  | RealtimeEventPreview[]
  | {
      data?:
        | RealtimeEventPreview[]
        | {
            items?: RealtimeEventPreview[];
            events?: RealtimeEventPreview[];
          };
      items?: RealtimeEventPreview[];
      events?: RealtimeEventPreview[];
    };
