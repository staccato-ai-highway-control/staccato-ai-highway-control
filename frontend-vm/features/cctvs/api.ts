import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import type { Cctv, CctvListParams, CctvSlot, StreamStatus } from "./types";

export const CAMERA_SLOT_STORAGE_KEY = "staccato.cameraSlotConfig";
export const CAMERA_ROI_STORAGE_KEY = "staccato.cameraRoiConfig";
export const ORIGINAL_WIDTH = 1920;
export const ORIGINAL_HEIGHT = 1080;

export type CameraSlotConfig = {
  slotNumber: number;
  cctvId: string;
  cctvName: string;
  streamUrl?: string;
};

export type RoiPoint = {
  x: number;
  y: number;
};

export type RoiType = "DRIVING_LANE" | "SHOULDER" | "IGNORE_ZONE";

export type RoiPolygon = {
  id: string;
  cameraSlotNumber: 1 | 2;
  cctvId: string;
  roiIndex: 1 | 2 | 3;
  roiName: string;
  roiType: RoiType;
  points: RoiPoint[];
};

export type CameraRoiConfig = {
  cameraSlotNumber: 1 | 2;
  cctvId: string;
  originalWidth: typeof ORIGINAL_WIDTH;
  originalHeight: typeof ORIGINAL_HEIGHT;
  polygons: RoiPolygon[];
};

type RawCctv = Partial<Cctv> & {
  id?: number | string;
  cctv_code?: string;
  cctv_name?: string;
  camera_id?: string;
  camera_name?: string;
  stream_url?: string;
  location_name?: string;
  road_name?: string;
  is_active?: number | boolean;
  active?: boolean;
  created_at?: string;
  updated_at?: string | null;
};

type CctvListResponse = FlexibleApiResponse<Cctv[]> | { items?: RawCctv[]; cameras?: RawCctv[]; count?: number; success?: boolean; ok?: boolean };
type CctvDetailResponse = FlexibleApiResponse<Cctv> | { item?: RawCctv; camera?: RawCctv; success?: boolean; ok?: boolean };
type CctvSlotListResponse = FlexibleApiResponse<CctvSlot[]> | { items?: CctvSlot[]; count?: number; success?: boolean };
type StreamStatusListResponse = FlexibleApiResponse<StreamStatus[]> | { items?: StreamStatus[]; count?: number; success?: boolean };

function buildQuery(params: Record<string, string | number | boolean | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeStatus(status?: string, active?: boolean | number) {
  if (status === "ACTIVE") return "ONLINE";
  if (status === "INACTIVE") return "OFFLINE";
  if (status === "MAINTENANCE") return "MAINTENANCE";
  if (status === "ONLINE" || status === "OFFLINE") return status;
  if (active === false || active === 0) return "OFFLINE";
  return "ONLINE";
}

function normalizeCctv(raw: RawCctv): Cctv {
  const id = String(raw.id ?? raw.camera_id ?? raw.cctv_code ?? "");
  const cctvCode = raw.cctvCode ?? raw.cctv_code ?? raw.camera_id ?? id;
  const name = raw.name ?? raw.cctv_name ?? raw.camera_name ?? cctvCode;
  const roadName = raw.roadName ?? raw.road_name ?? "-";
  const locationName = raw.locationName ?? raw.location_name ?? name;
  const isActive = raw.active ?? raw.is_active;

  return {
    id,
    cctvCode,
    name,
    road: raw.road ?? roadName,
    roadName,
    location: raw.location ?? locationName,
    locationName,
    direction: raw.direction ?? "-",
    status: normalizeStatus(raw.status, isActive),
    streamUrl: raw.streamUrl ?? raw.stream_url,
    imageUrl: raw.imageUrl,
    isLive: Boolean(raw.streamUrl ?? raw.stream_url),
    isAiDetected: raw.isAiDetected ?? false,
    detectionType: raw.detectionType,
    confidence: raw.confidence,
    lastUpdatedAt: raw.lastUpdatedAt ?? raw.updated_at ?? raw.created_at ?? "-",
    roiTypes: raw.roiTypes ?? [],
  };
}

function normalizeCctvList(response: CctvListResponse) {
  if (Array.isArray(response)) return response.map((item) => normalizeCctv(item as RawCctv));

  const data = getEnvelopeData<Cctv[] | { items?: RawCctv[]; cameras?: RawCctv[] }>(response as FlexibleApiResponse<Cctv[] | { items?: RawCctv[]; cameras?: RawCctv[] }>);
  if (Array.isArray(data)) return data.map((item) => normalizeCctv(item as RawCctv));
  return (data.items ?? data.cameras ?? []).map((item) => normalizeCctv(item));
}

function normalizeCctvDetail(response: CctvDetailResponse) {
  const data = getEnvelopeData<Cctv | { item?: RawCctv; camera?: RawCctv }>(response as FlexibleApiResponse<Cctv | { item?: RawCctv; camera?: RawCctv }>);
  if ("item" in data || "camera" in data) return normalizeCctv((data.item ?? data.camera ?? {}) as RawCctv);
  return normalizeCctv(data as RawCctv);
}

function normalizeSlots(response: CctvSlotListResponse): CameraSlotConfig[] {
  const data = Array.isArray(response)
    ? response
    : getEnvelopeData<CctvSlot[] | { items?: CctvSlot[] }>(response as FlexibleApiResponse<CctvSlot[] | { items?: CctvSlot[] }>);
  const slots = Array.isArray(data) ? data : data.items ?? [];
  const slotMap = new Map<number, CameraSlotConfig>();

  slots.forEach((slot) => {
    const slotNumber = Number(slot.slot_number ?? slot.slotNumber ?? slot.id);
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 8) return;

    const nested = slot.cctv ? normalizeCctv(slot.cctv as RawCctv) : null;
    const cctvId = String(slot.cctv_code ?? slot.cctv_id ?? nested?.id ?? "");
    slotMap.set(slotNumber, {
      slotNumber,
      cctvId,
      cctvName: slot.display_name ?? nested?.cctvCode ?? cctvId ?? `Slot ${slotNumber}`,
      streamUrl: nested?.streamUrl,
    });
  });

  return getEmptyCameraSlotConfig().map((fallback) => slotMap.get(fallback.slotNumber) ?? fallback);
}

export async function getCctvs(params: CctvListParams = {}) {
  const response = await apiClient<CctvListResponse>(`/api/cctvs${buildQuery(params as Record<string, string | number | boolean | undefined>)}`, { auth: false });
  return normalizeCctvList(response);
}

export async function getCctv(id: string) {
  const response = await apiClient<CctvDetailResponse>(`/api/cctvs/${id}`, { auth: false });
  return normalizeCctvDetail(response);
}

export async function getCctvByCode(code: string) {
  const response = await apiClient<CctvDetailResponse>(`/api/cctvs/code/${code}`, { auth: false });
  return normalizeCctvDetail(response);
}

export async function getCameras(params: CctvListParams = {}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  const response = await fetch(`/api/cctvs${query}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`CCTV 목록 조회 실패: ${response.status}`);
  }

  const data = await response.json();
  return normalizeCctvList(data as CctvListResponse);
}

export async function getCamera(cameraId: string | number) {
  const response = await apiClient<CctvDetailResponse>(`/api/cameras/${cameraId}`, { auth: false });
  return normalizeCctvDetail(response);
}

export async function getCctvStreamStatus() {
  const response = await apiClient<StreamStatusListResponse>("/api/cctvs/stream-status", { auth: false });
  const data = Array.isArray(response) ? response : getEnvelopeData<StreamStatus[] | { items?: StreamStatus[] }>(response as FlexibleApiResponse<StreamStatus[] | { items?: StreamStatus[] }>);
  return Array.isArray(data) ? data : data.items ?? [];
}

export async function getCctvSlots() {
  const response = await apiClient<CctvSlotListResponse>("/api/cctv-slots", { auth: false });
  return normalizeSlots(response);
}

export function getEmptyCameraSlotConfig(): CameraSlotConfig[] {
  return Array.from({ length: 8 }, (_, index) => ({
    slotNumber: index + 1,
    cctvId: "",
    cctvName: `Slot ${index + 1}`,
  }));
}

export function getCameraSlotConfig(): CameraSlotConfig[] {
  return getEmptyCameraSlotConfig();
}

export async function saveCameraSlotConfig(config: CameraSlotConfig[]) {
  const normalized = getEmptyCameraSlotConfig().map((fallback) => {
    const saved = config.find((item) => item.slotNumber === fallback.slotNumber);
    return saved ? { ...fallback, ...saved } : fallback;
  });

  const payload = {
    slots: normalized.map((item) => ({
      slot_number: item.slotNumber,
      cctv_id: item.cctvId || null,
      cctv_code: item.cctvId || null,
      display_name: item.cctvName || `Slot ${item.slotNumber}`,
    })),
  };

  const response = await apiClient<CctvSlotListResponse>("/api/cctv-slots", {
    method: "PUT",
    auth: false,
    body: payload,
  });

  return normalizeSlots(response);
}

const defaultRoiMeta: Array<{ roiIndex: 1 | 2 | 3; roiName: string; roiType: RoiType }> = [
  { roiIndex: 1, roiName: "주행 차로", roiType: "DRIVING_LANE" },
  { roiIndex: 2, roiName: "갓길", roiType: "SHOULDER" },
  { roiIndex: 3, roiName: "제외 영역", roiType: "IGNORE_ZONE" },
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createDefaultCameraRoiConfig(cameraSlotNumber: 1 | 2, cctvId: string): CameraRoiConfig {
  return {
    cameraSlotNumber,
    cctvId,
    originalWidth: ORIGINAL_WIDTH,
    originalHeight: ORIGINAL_HEIGHT,
    polygons: defaultRoiMeta.map((item) => ({
      id: `roi-${cameraSlotNumber}-${item.roiIndex}`,
      cameraSlotNumber,
      cctvId,
      roiIndex: item.roiIndex,
      roiName: item.roiName,
      roiType: item.roiType,
      points: [],
    })),
  };
}

function getStoredRoiConfigs() {
  if (!canUseStorage()) return [] as CameraRoiConfig[];

  try {
    const raw = window.localStorage.getItem(CAMERA_ROI_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CameraRoiConfig[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCameraRoiConfig(cameraSlotNumber: 1 | 2, cctvId: string): CameraRoiConfig {
  const saved = getStoredRoiConfigs().find((item) => item.cameraSlotNumber === cameraSlotNumber);
  const fallback = createDefaultCameraRoiConfig(cameraSlotNumber, cctvId);
  if (!saved) return fallback;

  return {
    ...fallback,
    cctvId,
    polygons: fallback.polygons.map((polygon) => {
      const savedPolygon = saved.polygons.find((item) => item.roiIndex === polygon.roiIndex);
      return savedPolygon
        ? { ...polygon, ...savedPolygon, cameraSlotNumber, cctvId }
        : polygon;
    }),
  };
}

export function saveCameraRoiConfig(cameraSlotNumber: 1 | 2, roiConfig: CameraRoiConfig) {
  const normalized: CameraRoiConfig = {
    ...roiConfig,
    cameraSlotNumber,
    originalWidth: ORIGINAL_WIDTH,
    originalHeight: ORIGINAL_HEIGHT,
    polygons: roiConfig.polygons.map((polygon) => ({
      ...polygon,
      cameraSlotNumber,
      cctvId: roiConfig.cctvId,
      points: polygon.points.map((point) => ({
        x: Math.max(0, Math.min(ORIGINAL_WIDTH, Math.round(point.x))),
        y: Math.max(0, Math.min(ORIGINAL_HEIGHT, Math.round(point.y))),
      })),
    })),
  };

  if (canUseStorage()) {
    const others = getStoredRoiConfigs().filter((item) => item.cameraSlotNumber !== cameraSlotNumber);
    window.localStorage.setItem(CAMERA_ROI_STORAGE_KEY, JSON.stringify([...others, normalized]));
  }

  return normalized;
}
