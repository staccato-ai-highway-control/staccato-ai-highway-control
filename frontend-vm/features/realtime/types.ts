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

export type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

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
};

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
