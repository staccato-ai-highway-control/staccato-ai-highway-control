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
  streamUrl?: string;
  imageUrl?: string;
  isLive: boolean;
  isAiDetected: boolean;
  detectionType?: string;
  confidence?: number;
  lastUpdatedAt: string;
  roiTypes: Array<"LANE" | "SHOULDER">;
};
