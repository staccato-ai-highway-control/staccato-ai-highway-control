/**
 * 파일 역할: CCTV 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Cctv, CctvListParams, CctvSlot, StreamStatus } from "./types";

// 코드 설명: CAMERA_SLOT_STORAGE_KEY 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const CAMERA_SLOT_STORAGE_KEY = "staccato.cameraSlotConfig";
// 코드 설명: CAMERA_ROI_STORAGE_KEY 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const CAMERA_ROI_STORAGE_KEY = "staccato.cameraRoiConfig";
// 코드 설명: ORIGINAL_WIDTH 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const ORIGINAL_WIDTH = 1920;
// 코드 설명: ORIGINAL_HEIGHT 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const ORIGINAL_HEIGHT = 1080;

// 코드 설명: CameraSlotConfig 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type CameraSlotConfig = {
  slotNumber: number;
  cctvId: string;
  cctvName: string;
  streamUrl?: string;
};

// 코드 설명: RoiPoint 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type RoiPoint = {
  x: number;
  y: number;
};

// 코드 설명: RoiType 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type RoiType = "DRIVING_LANE" | "SHOULDER" | "IGNORE_ZONE";

// 코드 설명: RoiPolygon 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type RoiPolygon = {
  id: string;
  cameraSlotNumber: 1 | 2;
  cctvId: string;
  roiIndex: 1 | 2 | 3;
  roiName: string;
  roiType: RoiType;
  points: RoiPoint[];
};

// 코드 설명: CameraRoiConfig 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type CameraRoiConfig = {
  cameraSlotNumber: 1 | 2;
  cctvId: string;
  originalWidth: typeof ORIGINAL_WIDTH;
  originalHeight: typeof ORIGINAL_HEIGHT;
  polygons: RoiPolygon[];
};

// 코드 설명: RawCctv 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
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

// 코드 설명: CctvListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type CctvListResponse = FlexibleApiResponse<Cctv[]> | { items?: RawCctv[]; cameras?: RawCctv[]; count?: number; success?: boolean; ok?: boolean };
// 코드 설명: CctvDetailResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type CctvDetailResponse = FlexibleApiResponse<Cctv> | { item?: RawCctv; camera?: RawCctv; success?: boolean; ok?: boolean };
// 코드 설명: CctvSlotListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type CctvSlotListResponse = FlexibleApiResponse<CctvSlot[]> | { items?: CctvSlot[]; count?: number; success?: boolean };
// 코드 설명: StreamStatusListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type StreamStatusListResponse = FlexibleApiResponse<StreamStatus[]> | { items?: StreamStatus[]; count?: number; success?: boolean };

// 코드 설명: buildQuery 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function buildQuery(params: Record<string, string | number | boolean | undefined> = {}) {
  // 코드 설명: query 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
  const query = new URLSearchParams();
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: Object.entries(params).forEach(([key, value]) => { if (value !== undefi…
  Object.entries(params).forEach(([key, value]) => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value !== undefined && value !== null && value !== ""
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  // 코드 설명: queryString 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const queryString = query.toString();
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: queryString ? `?${queryString}` : ""
  return queryString ? `?${queryString}` : "";
}

// 코드 설명: normalizeStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeStatus(status?: string, active?: boolean | number) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: status === "ACTIVE"
  if (status === "ACTIVE") return "ONLINE";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: status === "INACTIVE"
  if (status === "INACTIVE") return "OFFLINE";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: status === "MAINTENANCE"
  if (status === "MAINTENANCE") return "MAINTENANCE";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: status === "ONLINE" || status === "OFFLINE"
  if (status === "ONLINE" || status === "OFFLINE") return status;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: active === false || active === 0
  if (active === false || active === 0) return "OFFLINE";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "ONLINE"
  return "ONLINE";
}

// 코드 설명: normalizeCctv 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeCctv(raw: RawCctv): Cctv {
  // 코드 설명: id 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const id = String(raw.id ?? raw.camera_id ?? raw.cctv_code ?? "");
  // 코드 설명: cctvCode 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const cctvCode = raw.cctvCode ?? raw.cctv_code ?? raw.camera_id ?? id;
  // 코드 설명: name 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const name = raw.name ?? raw.cctv_name ?? raw.camera_name ?? cctvCode;
  // 코드 설명: roadName 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const roadName = raw.roadName ?? raw.road_name ?? "-";
  // 코드 설명: locationName 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const locationName = raw.locationName ?? raw.location_name ?? name;
  // 코드 설명: isActive 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isActive = raw.active ?? raw.is_active;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { id, cctvCode, name, road: raw.road ?? roadName, roadName, location: r…
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

// 코드 설명: normalizeCctvList 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeCctvList(response: CctvListResponse) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response)
  if (Array.isArray(response)) return response.map((item) => normalizeCctv(item as RawCctv));

  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = getEnvelopeData<Cctv[] | { items?: RawCctv[]; cameras?: RawCctv[] }>(response as FlexibleApiResponse<Cctv[] | { items?: RawCctv[]; cameras?: RawCctv[] }>);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(data)
  if (Array.isArray(data)) return data.map((item) => normalizeCctv(item as RawCctv));
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: (data.items ?? data.cameras ?? []).map((item) => normalizeCctv(item))
  return (data.items ?? data.cameras ?? []).map((item) => normalizeCctv(item));
}

// 코드 설명: normalizeCctvDetail 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeCctvDetail(response: CctvDetailResponse) {
  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = getEnvelopeData<Cctv | { item?: RawCctv; camera?: RawCctv }>(response as FlexibleApiResponse<Cctv | { item?: RawCctv; camera?: RawCctv }>);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: "item" in data || "camera" in data
  if ("item" in data || "camera" in data) return normalizeCctv((data.item ?? data.camera ?? {}) as RawCctv);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeCctv(data as RawCctv)
  return normalizeCctv(data as RawCctv);
}

// 코드 설명: normalizeSlots 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeSlots(response: CctvSlotListResponse): CameraSlotConfig[] {
  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = Array.isArray(response)
    ? response
    : getEnvelopeData<CctvSlot[] | { items?: CctvSlot[] }>(response as FlexibleApiResponse<CctvSlot[] | { items?: CctvSlot[] }>);
  // 코드 설명: slots 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const slots = Array.isArray(data) ? data : data.items ?? [];
  // 코드 설명: slotMap 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const slotMap = new Map<number, CameraSlotConfig>();

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: slots.forEach((slot) => { const slotNumber = Number(slot.slot_number ??…
  slots.forEach((slot) => {
    // 코드 설명: slotNumber 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const slotNumber = Number(slot.slot_number ?? slot.slotNumber ?? slot.id);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 8
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 8) return;

    // 코드 설명: nested 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const nested = slot.cctv ? normalizeCctv(slot.cctv as RawCctv) : null;
    // 코드 설명: cctvId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const cctvId = String(slot.cctv_code ?? slot.cctv_id ?? nested?.id ?? "");
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: slotMap.set(slotNumber, { slotNumber, cctvId, cctvName: slot.display_na…
    slotMap.set(slotNumber, {
      slotNumber,
      cctvId,
      cctvName: slot.display_name ?? nested?.cctvCode ?? cctvId ?? `Slot ${slotNumber}`,
      streamUrl: nested?.streamUrl,
    });
  });

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEmptyCameraSlotConfig().map((fallback) => slotMap.get(fallback.slotN…
  return getEmptyCameraSlotConfig().map((fallback) => slotMap.get(fallback.slotNumber) ?? fallback);
}

// 코드 설명: getCctvs 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getCctvs(params: CctvListParams = {}) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<CctvListResponse>(`/api/cctvs${buildQuery(params as Record<string, string | number | boolean | undefined>)}`, { auth: false });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeCctvList(response)
  return normalizeCctvList(response);
}

// 코드 설명: getCctv 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getCctv(id: string) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<CctvDetailResponse>(`/api/cctvs/${id}`, { auth: false });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeCctvDetail(response)
  return normalizeCctvDetail(response);
}

// 코드 설명: getCctvByCode 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getCctvByCode(code: string) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<CctvDetailResponse>(`/api/cctvs/code/${code}`, { auth: false });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeCctvDetail(response)
  return normalizeCctvDetail(response);
}

// 코드 설명: getCameras 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getCameras(params: CctvListParams = {}) {
  // 코드 설명: query 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await fetch(`/api/cctvs${query}`, {
    method: "GET",
    cache: "no-store",
  });

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !response.ok
  if (!response.ok) {
    // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error(`CCTV 목록 조회 실패: ${response.status}`)
    throw new Error(`CCTV 목록 조회 실패: ${response.status}`);
  }

  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = await response.json();
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeCctvList(data as CctvListResponse)
  return normalizeCctvList(data as CctvListResponse);
}

// 코드 설명: getCamera 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getCamera(cameraId: string | number) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<CctvDetailResponse>(`/api/cameras/${cameraId}`, { auth: false });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeCctvDetail(response)
  return normalizeCctvDetail(response);
}

// 코드 설명: getCctvStreamStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getCctvStreamStatus() {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<StreamStatusListResponse>("/api/cctvs/stream-status", { auth: false });
  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = Array.isArray(response) ? response : getEnvelopeData<StreamStatus[] | { items?: StreamStatus[] }>(response as FlexibleApiResponse<StreamStatus[] | { items?: StreamStatus[] }>);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Array.isArray(data) ? data : data.items ?? []
  return Array.isArray(data) ? data : data.items ?? [];
}

// 코드 설명: getCctvSlots 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getCctvSlots() {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<CctvSlotListResponse>("/api/cctv-slots", { auth: false });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeSlots(response)
  return normalizeSlots(response);
}

// 코드 설명: getEmptyCameraSlotConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getEmptyCameraSlotConfig(): CameraSlotConfig[] {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Array.from({ length: 8 }, (_, index) => ({ slotNumber: index + 1, cctvI…
  return Array.from({ length: 8 }, (_, index) => ({
    slotNumber: index + 1,
    cctvId: "",
    cctvName: `Slot ${index + 1}`,
  }));
}

// 코드 설명: getCameraSlotConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getCameraSlotConfig(): CameraSlotConfig[] {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEmptyCameraSlotConfig()
  return getEmptyCameraSlotConfig();
}

// 코드 설명: saveCameraSlotConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function saveCameraSlotConfig(config: CameraSlotConfig[]) {
  // 코드 설명: normalized 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const normalized = getEmptyCameraSlotConfig().map((fallback) => {
    // 코드 설명: saved 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const saved = config.find((item) => item.slotNumber === fallback.slotNumber);
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: saved ? { ...fallback, ...saved } : fallback
    return saved ? { ...fallback, ...saved } : fallback;
  });

  // 코드 설명: payload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const payload = {
    slots: normalized.map((item) => ({
      slot_number: item.slotNumber,
      cctv_id: item.cctvId || null,
      cctv_code: item.cctvId || null,
      display_name: item.cctvName || `Slot ${item.slotNumber}`,
    })),
  };

  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<CctvSlotListResponse>("/api/cctv-slots", {
    method: "PUT",
    auth: false,
    body: payload,
  });

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeSlots(response)
  return normalizeSlots(response);
}

// 코드 설명: defaultRoiMeta 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const defaultRoiMeta: Array<{ roiIndex: 1 | 2 | 3; roiName: string; roiType: RoiType }> = [
  { roiIndex: 1, roiName: "주행 차로", roiType: "DRIVING_LANE" },
  { roiIndex: 2, roiName: "갓길", roiType: "SHOULDER" },
  { roiIndex: 3, roiName: "제외 영역", roiType: "IGNORE_ZONE" },
];

// 코드 설명: canUseStorage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function canUseStorage() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: typeof window !== "undefined" && typeof window.localStorage !== "undefi…
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// 코드 설명: createDefaultCameraRoiConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function createDefaultCameraRoiConfig(cameraSlotNumber: 1 | 2, cctvId: string): CameraRoiConfig {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { cameraSlotNumber, cctvId, originalWidth: ORIGINAL_WIDTH, originalHeig…
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

// 코드 설명: getStoredRoiConfigs 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getStoredRoiConfigs() {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canUseStorage()
  if (!canUseStorage()) return [] as CameraRoiConfig[];

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: raw 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const raw = window.localStorage.getItem(CAMERA_ROI_STORAGE_KEY);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !raw
    if (!raw) return [];
    // 코드 설명: parsed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const parsed = JSON.parse(raw) as CameraRoiConfig[];
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Array.isArray(parsed) ? parsed : []
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: []
    return [];
  }
}

// 코드 설명: getCameraRoiConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getCameraRoiConfig(cameraSlotNumber: 1 | 2, cctvId: string): CameraRoiConfig {
  // 코드 설명: saved 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const saved = getStoredRoiConfigs().find((item) => item.cameraSlotNumber === cameraSlotNumber);
  // 코드 설명: fallback 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const fallback = createDefaultCameraRoiConfig(cameraSlotNumber, cctvId);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !saved
  if (!saved) return fallback;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { ...fallback, cctvId, polygons: fallback.polygons.map((polygon) => { c…
  return {
    ...fallback,
    cctvId,
    polygons: fallback.polygons.map((polygon) => {
      // 코드 설명: savedPolygon 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const savedPolygon = saved.polygons.find((item) => item.roiIndex === polygon.roiIndex);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: savedPolygon ? { ...polygon, ...savedPolygon, cameraSlotNumber, cctvId …
      return savedPolygon
        ? { ...polygon, ...savedPolygon, cameraSlotNumber, cctvId }
        : polygon;
    }),
  };
}

// 코드 설명: saveCameraRoiConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function saveCameraRoiConfig(cameraSlotNumber: 1 | 2, roiConfig: CameraRoiConfig) {
  // 코드 설명: normalized 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
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

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: canUseStorage()
  if (canUseStorage()) {
    // 코드 설명: others 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const others = getStoredRoiConfigs().filter((item) => item.cameraSlotNumber !== cameraSlotNumber);
    // 코드 설명: 브라우저 localStorage의 인증 또는 사용자 설정 값을 읽거나 갱신합니다.
    window.localStorage.setItem(CAMERA_ROI_STORAGE_KEY, JSON.stringify([...others, normalized]));
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalized
  return normalized;
}
