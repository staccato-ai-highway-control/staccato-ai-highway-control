export type ManualIncidentType =
  | "LANE_STOP"
  | "SHOULDER_STOP"
  | "OBSTACLE"
  | "PEDESTRIAN"
  | "WRONG_WAY"
  | "ACCIDENT"
  | "ETC";

export type ManualIncidentRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ManualIncidentStatus = "DETECTED" | "REVIEWING";

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

export type ManualIncident = ManualIncidentPayload & {
  id: string;
  incidentCode: string;
  createdAt: string;
};
