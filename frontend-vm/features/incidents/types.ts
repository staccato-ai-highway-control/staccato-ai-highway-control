export type IncidentType = "LANE_STOP" | "SHOULDER_STOP";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "DETECTED" | "REVIEWING" | "ASSIGNED" | "RESOLVED" | "FALSE_POSITIVE" | "CLOSED";

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

export const incidentTypeLabels: Record<IncidentType, string> = {
  LANE_STOP: "주행차로 정차",
  SHOULDER_STOP: "갓길 정차",
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "긴급",
};

export const incidentStatusLabels: Record<IncidentStatus, string> = {
  DETECTED: "탐지됨",
  REVIEWING: "검토중",
  ASSIGNED: "담당 배정",
  RESOLVED: "처리완료",
  FALSE_POSITIVE: "오탐종료",
  CLOSED: "종결",
};
