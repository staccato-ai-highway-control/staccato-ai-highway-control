/**
 * 파일 역할: 돌발 상황 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type IncidentType = "LANE_STOP" | "SHOULDER_STOP";
// 코드 설명: RiskLevel 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
// 코드 설명: IncidentStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type IncidentStatus = "DETECTED" | "REVIEWING" | "ASSIGNED" | "RESOLVED" | "FALSE_POSITIVE" | "CLOSED";

// 코드 설명: Incident 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type Incident = {
  id: string;
  code: string;
  title: string;
  eventType: IncidentType;
  roadName: string;
  location: string;
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  stoppedDurationSec: number;
  status: IncidentStatus;
  detectedAt: string;
  assignee?: string;
  cctvId: string;
  snapshotUrl: string;
  roiType: "LANE" | "SHOULDER";
  movementDeltaPx: number;
  memo?: string;
  analysis_job_id?: string | number | null;
  job_id?: string | number | null;
  report_id?: string | number | null;
  its: {
    weather: string;
    trafficVolume: string;
    nearestPatrolEta: string;
  };
};

// 코드 설명: incidentTypeLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const incidentTypeLabels: Record<IncidentType, string> = {
  LANE_STOP: "주행차로 정차",
  SHOULDER_STOP: "갓길 정차",
};

// 코드 설명: riskLevelLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const riskLevelLabels: Record<RiskLevel, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "긴급",
};

// 코드 설명: incidentStatusLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const incidentStatusLabels: Record<IncidentStatus, string> = {
  DETECTED: "탐지됨",
  REVIEWING: "검토중",
  ASSIGNED: "담당 배정",
  RESOLVED: "처리완료",
  FALSE_POSITIVE: "오탐종료",
  CLOSED: "종결",
};
