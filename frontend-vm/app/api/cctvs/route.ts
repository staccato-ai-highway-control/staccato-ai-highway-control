import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ||
  process.env.NEXT_PUBLIC_AI_VM_BASE_URL ||
  "http://192.168.0.186:5001";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

const MAX_VISIBLE_CAMERAS = parsePositiveInt(process.env.CCTV_LIST_MAX_VISIBLE, 60);
const DEFAULT_LIMIT = Math.min(
  parsePositiveInt(process.env.CCTV_LIST_DEFAULT_LIMIT, MAX_VISIBLE_CAMERAS),
  MAX_VISIBLE_CAMERAS
);

function getRawItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.cameras)) return payload.cameras;
  if (Array.isArray(payload.response?.body?.items)) return payload.response.body.items;
  return [];
}

function pickSourceUrl(item: any): string {
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

function parseLimit(request: Request): number {
  const { searchParams } = new URL(request.url);
  const requestedLimit = parsePositiveInt(
    searchParams.get("limit") || undefined,
    DEFAULT_LIMIT
  );

  return Math.min(requestedLimit, MAX_VISIBLE_CAMERAS);
}

function normalizeCctv(item: any, index: number) {
  const n = index + 1;
  const displayCode = `CCTV-${String(n).padStart(3, "0")}`;
  const cameraId = `camera-${n}`;
  const sourceUrl = pickSourceUrl(item);
  const streamQuery = sourceUrl ? `?source_url=${encodeURIComponent(sourceUrl)}` : "";

  const name =
    item.cctvName ||
    item.cctvname ||
    item.cctv_name ||
    item.name ||
    `STACCATO CCTV ${n}`;

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

export async function GET(request: Request) {
  try {
    const upstreamUrl = `${AI_VM_BASE_URL.replace(/\/$/, "")}/traffic/api/cctv`;

    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
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

    const payload = await response.json();
    const rawItems = getRawItems(payload);
    const limit = parseLimit(request);
    const cameras = rawItems.slice(0, limit).map(normalizeCctv);

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
