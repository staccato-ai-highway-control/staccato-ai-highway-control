import { mockCctvs } from "./mock";

export async function getCctvs() {
  return mockCctvs;
}

export async function getCctv(id: string) {
  return mockCctvs.find((cctv) => cctv.id === id) ?? mockCctvs[0];
}



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

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getCctvLabel(cctvId: string) {
  const cctv = mockCctvs.find((item) => item.id === cctvId);
  return cctv ? cctv.cctvCode : cctvId;
}

export function getDefaultCameraSlotConfig(): CameraSlotConfig[] {
  return Array.from({ length: 8 }, (_, index) => {
    const cctv = mockCctvs[index] ?? mockCctvs[0];

    return {
      slotNumber: index + 1,
      cctvId: cctv.id,
      cctvName: cctv.cctvCode,
      streamUrl: cctv.streamUrl,
    };
  });
}

export function getCameraSlotConfig(): CameraSlotConfig[] {
  if (!canUseStorage()) return getDefaultCameraSlotConfig();

  try {
    const raw = window.localStorage.getItem(CAMERA_SLOT_STORAGE_KEY);
    if (!raw) return getDefaultCameraSlotConfig();

    const parsed = JSON.parse(raw) as CameraSlotConfig[];
    if (!Array.isArray(parsed)) return getDefaultCameraSlotConfig();

    const defaults = getDefaultCameraSlotConfig();
    return defaults.map((fallback) => {
      const saved = parsed.find((item) => item.slotNumber === fallback.slotNumber);
      if (!saved?.cctvId) return fallback;

      const cctv = mockCctvs.find((item) => item.id === saved.cctvId);
      return {
        slotNumber: fallback.slotNumber,
        cctvId: saved.cctvId,
        cctvName: cctv?.cctvCode ?? saved.cctvName ?? getCctvLabel(saved.cctvId),
        streamUrl: cctv?.streamUrl ?? saved.streamUrl,
      };
    });
  } catch {
    return getDefaultCameraSlotConfig();
  }
}

export function saveCameraSlotConfig(config: CameraSlotConfig[]) {
  const normalized = config.slice(0, 8).map((item, index) => {
    const cctv = mockCctvs.find((candidate) => candidate.id === item.cctvId);
    return {
      slotNumber: index + 1,
      cctvId: item.cctvId,
      cctvName: cctv?.cctvCode ?? item.cctvName,
      streamUrl: cctv?.streamUrl ?? item.streamUrl,
    };
  });

  if (canUseStorage()) {
    window.localStorage.setItem(CAMERA_SLOT_STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
}

const defaultRoiMeta: Array<{ roiIndex: 1 | 2 | 3; roiName: string; roiType: RoiType }> = [
  { roiIndex: 1, roiName: "주행 차로", roiType: "DRIVING_LANE" },
  { roiIndex: 2, roiName: "갓길", roiType: "SHOULDER" },
  { roiIndex: 3, roiName: "제외 영역", roiType: "IGNORE_ZONE" },
];

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
