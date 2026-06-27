/**
 * 파일 역할: CCTV 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type Cctv = {
  id: string;
  cctvCode: string;
  name: string;
  road: string;
  roadName: string;
  location: string;
  locationName: string;
  direction: string;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE";
  cameraId?: string;
  streamUrl?: string;
  imageUrl?: string;
  bboxWsUrl?: string;
  isLive: boolean;
  isAiDetected: boolean;
  detectionType?: string;
  confidence?: number;
  lastUpdatedAt: string;
  roiTypes: Array<"LANE" | "SHOULDER">;
};


// 코드 설명: CctvListParams 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type CctvListParams = {
  is_active?: 1 | 0 | true | false | "1" | "0" | "true" | "false" | "yes" | "no";
  road_name?: string;
  limit?: number;
};

// 코드 설명: CctvSlot 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type CctvSlot = {
  id?: number | string;
  slot_number?: number;
  slotNumber?: number;
  cctv_id?: number | string | null;
  cctv_code?: string | null;
  camera_id?: string | null;
  display_name?: string | null;
  cctv?: Partial<Cctv> | null;
};

// 코드 설명: StreamStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type StreamStatus = {
  id?: number | string;
  cctv_id?: number | string;
  cctv_code?: string;
  camera_id?: string;
  status?: string;
  active?: boolean;
  stream_url?: string;
};
