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


export type CctvListParams = {
  is_active?: 1 | 0 | true | false | "1" | "0" | "true" | "false" | "yes" | "no";
  road_name?: string;
};

export type CctvSlot = {
  id?: number | string;
  slot_number?: number;
  slotNumber?: number;
  cctv_id?: number | string | null;
  cctv_code?: string | null;
  display_name?: string | null;
  cctv?: Partial<Cctv> | null;
};

export type StreamStatus = {
  id?: number | string;
  cctv_id?: number | string;
  cctv_code?: string;
  camera_id?: string;
  status?: string;
  active?: boolean;
  stream_url?: string;
};
