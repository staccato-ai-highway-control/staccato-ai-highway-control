/**
 * 파일 역할: 서비스 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type ManualIncidentType =
  | "LANE_STOP"
  | "SHOULDER_STOP"
  | "OBSTACLE"
  | "PEDESTRIAN"
  | "WRONG_WAY"
  | "ACCIDENT"
  | "ETC";

// 코드 설명: ManualIncidentRiskLevel 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ManualIncidentRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// 코드 설명: ManualIncidentStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ManualIncidentStatus = "DETECTED" | "REVIEWING";

// 코드 설명: ManualIncidentPayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ManualIncidentPayload = {
  incidentType: ManualIncidentType;
  riskLevel: ManualIncidentRiskLevel;
  title: string;
  description: string;
  detectedAt: string;
  status: ManualIncidentStatus;
  cctvId: string;
  cctvCode: string;
  roadName: string;
  locationName: string;
  direction: string;
  sourceType: "MANUAL" | "LIVE_CCTV";
  memo?: string;
  assignee?: string;
  createdBy?: string;
};

// 코드 설명: ManualIncident 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ManualIncident = ManualIncidentPayload & {
  id: string;
  incidentCode: string;
  createdAt: string;
};
