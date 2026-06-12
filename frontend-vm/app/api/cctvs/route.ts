/**
 * 파일 역할: CCTV 요청을 백엔드 또는 외부 미디어 서버로 중계하는 Next.js Route Handler입니다.
 * 유지보수 참고: 브라우저에 노출할 응답 상태와 헤더를 정리하며, 서버 주소나 내부 오류 정보가 그대로 전달되지 않도록 주의합니다.
 */
import { NextResponse } from "next/server";

// 코드 설명: dynamic 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const dynamic = "force-dynamic";

// 코드 설명: AI_VM_BASE_URL 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ||
  process.env.NEXT_PUBLIC_AI_VM_BASE_URL ||
  "http://192.168.0.186:5001";

// 코드 설명: parsePositiveInt 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function parsePositiveInt(value: string | undefined, fallback: number): number {
  // 코드 설명: parsed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const parsed = Number(value);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !Number.isFinite(parsed) || parsed <= 0
  if (!Number.isFinite(parsed) || parsed <= 0) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: fallback
    return fallback;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Math.floor(parsed)
  return Math.floor(parsed);
}

// 코드 설명: MAX_VISIBLE_CAMERAS 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const MAX_VISIBLE_CAMERAS = parsePositiveInt(process.env.CCTV_LIST_MAX_VISIBLE, 60);
// 코드 설명: DEFAULT_LIMIT 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const DEFAULT_LIMIT = Math.min(
  parsePositiveInt(process.env.CCTV_LIST_DEFAULT_LIMIT, MAX_VISIBLE_CAMERAS),
  MAX_VISIBLE_CAMERAS
);

// 코드 설명: getRawItems 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getRawItems(payload: any): any[] {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(payload)
  if (Array.isArray(payload)) return payload;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(payload.data)
  if (Array.isArray(payload.data)) return payload.data;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(payload.items)
  if (Array.isArray(payload.items)) return payload.items;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(payload.cameras)
  if (Array.isArray(payload.cameras)) return payload.cameras;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(payload.response?.body?.items)
  if (Array.isArray(payload.response?.body?.items)) return payload.response.body.items;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: []
  return [];
}

// 코드 설명: pickSourceUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function pickSourceUrl(item: any): string {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String( item.cctvUrl || item.cctvurl || item.cctv_url || item.streamUrl…
  return String(
    item.cctvUrl ||
    item.cctvurl ||
    item.cctv_url ||
    item.streamUrl ||
    item.stream_url ||
    item.sourceUrl ||
    item.source_url ||
    item.url ||
    item.rtspUrl ||
    item.rtsp_url ||
    ""
  );
}

// 코드 설명: parseLimit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function parseLimit(request: Request): number {
  // 코드 설명: { searchParams } 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const { searchParams } = new URL(request.url);
  // 코드 설명: requestedLimit 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const requestedLimit = parsePositiveInt(
    searchParams.get("limit") || undefined,
    DEFAULT_LIMIT
  );

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Math.min(requestedLimit, MAX_VISIBLE_CAMERAS)
  return Math.min(requestedLimit, MAX_VISIBLE_CAMERAS);
}

// 코드 설명: normalizeCctv 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeCctv(item: any, index: number) {
  // 코드 설명: n 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const n = index + 1;
  // 코드 설명: displayCode 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const displayCode = `CCTV-${String(n).padStart(3, "0")}`;
  // 코드 설명: cameraId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const cameraId = `camera-${n}`;
  // 코드 설명: sourceUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const sourceUrl = pickSourceUrl(item);
  // 코드 설명: streamQuery 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const streamQuery = sourceUrl ? `?source_url=${encodeURIComponent(sourceUrl)}` : "";

  // 코드 설명: name 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const name =
    item.cctvName ||
    item.cctvname ||
    item.cctv_name ||
    item.name ||
    `STACCATO CCTV ${n}`;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { id: displayCode, cctvCode: displayCode, cctv_code: displayCode, camer…
  return {
    id: displayCode,
    cctvCode: displayCode,
    cctv_code: displayCode,
    camera_id: cameraId,

    name,
    cctv_name: name,

    road: item.roadName || item.road_name || item.routeName || "STACCATO 고속도로",
    roadName: item.roadName || item.road_name || item.routeName || "STACCATO 고속도로",
    road_name: item.roadName || item.road_name || item.routeName || "STACCATO 고속도로",

    location: item.location || item.locationName || item.location_name || `${n}번 관제 구간`,
    locationName: item.locationName || item.location_name || item.location || `${n}번 관제 구간`,
    location_name: item.locationName || item.location_name || item.location || `${n}번 관제 구간`,

    direction: item.direction || "-",
    status: "ONLINE",
    active: true,
    is_active: true,

    streamUrl: `/api/cctvs/${encodeURIComponent(cameraId)}/stream${streamQuery}`,
    stream_url: `/api/cctvs/${encodeURIComponent(cameraId)}/stream${streamQuery}`,

    imageUrl: `/api/cctvs/${encodeURIComponent(cameraId)}/snapshot`,
    snapshotUrl: `/api/cctvs/${encodeURIComponent(cameraId)}/snapshot`,
    bboxWsUrl: `/api/cctvs/${encodeURIComponent(cameraId)}/bbox`,

    sourceUrl,
    isLive: true,
    isAiDetected: false,
    roiTypes: [],
    original: item,
  };
}

// 코드 설명: GET 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function GET(request: Request) {
  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: upstreamUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const upstreamUrl = `${AI_VM_BASE_URL.replace(/\/$/, "")}/traffic/api/cctv`;

    // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !response.ok
    if (!response.ok) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: NextResponse.json( { success: false, message: `AI CCTV API failed: ${re…
      return NextResponse.json(
        {
          success: false,
          message: `AI CCTV API failed: ${response.status}`,
          count: 0,
          rawCount: 0,
          selectedCount: 0,
          limit: DEFAULT_LIMIT,
          maxVisibleCameras: MAX_VISIBLE_CAMERAS,
          streamProbeSkipped: true,
          data: [],
          items: [],
          cameras: [],
        },
        { status: 502 }
      );
    }

    // 코드 설명: payload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const payload = await response.json();
    // 코드 설명: rawItems 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const rawItems = getRawItems(payload);
    // 코드 설명: limit 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const limit = parseLimit(request);
    // 코드 설명: cameras 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const cameras = rawItems.slice(0, limit).map(normalizeCctv);

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: NextResponse.json({ success: true, count: cameras.length, rawCount: raw…
    return NextResponse.json({
      success: true,
      count: cameras.length,
      rawCount: rawItems.length,
      selectedCount: cameras.length,
      limit,
      maxVisibleCameras: MAX_VISIBLE_CAMERAS,
      streamProbeSkipped: true,
      message:
        "CCTV metadata list fetched without stream probing",
      data: cameras,
      items: cameras,
      cameras,
    });
  } catch (error) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: NextResponse.json( { success: false, message: error instanceof Error ? …
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "CCTV metadata fetch failed",
        count: 0,
        rawCount: 0,
        selectedCount: 0,
        limit: DEFAULT_LIMIT,
        maxVisibleCameras: MAX_VISIBLE_CAMERAS,
        streamProbeSkipped: true,
        data: [],
        items: [],
        cameras: [],
      },
      { status: 500 }
    );
  }
}
