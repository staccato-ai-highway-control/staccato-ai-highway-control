import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ||
  process.env.NEXT_PUBLIC_AI_VM_BASE_URL ||
  "http://192.168.0.186:5001";

const PLAYABLE_CACHE_TTL_MS = 5 * 60 * 1000;

type PlayableCache = {
  expiresAt: number;
  items: any[];
};

let playableCache: PlayableCache | null = null;

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

async function isPlayable(item: any, probeIndex: number) {
  const sourceUrl = pickSourceUrl(item);
  if (!sourceUrl) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  const probeCameraId = `probe-${probeIndex}`;
  const upstream = new URL(
    `/streams/${encodeURIComponent(probeCameraId)}.mjpeg`,
    AI_VM_BASE_URL
  );

  upstream.searchParams.set("source_url", sourceUrl);
  upstream.searchParams.set("quality", "45");
  upstream.searchParams.set("analysis_fps", "0.5");

  try {
    const response = await fetch(upstream.toString(), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "multipart/x-mixed-replace,image/jpeg,*/*",
      },
    });

    const contentType = response.headers.get("content-type") || "";

    if (response.body) {
      try {
        await response.body.cancel();
      } catch {}
    }

    return response.ok && (
      contentType.includes("multipart/x-mixed-replace") ||
      contentType.includes("image/jpeg") ||
      contentType.includes("application/octet-stream")
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function pickPlayableItems(rawItems: any[]) {
  const now = Date.now();

  if (playableCache && playableCache.expiresAt > now && playableCache.items.length >= 1) {
    return playableCache.items;
  }

  const candidates = rawItems.filter((item) => pickSourceUrl(item)).slice(0, 60);
  const playable: any[] = [];

  const batchSize = 4;

  for (let start = 0; start < candidates.length && playable.length < 1; start += batchSize) {
    const batch = candidates.slice(start, start + batchSize);

    const results = await Promise.all(
      batch.map(async (item, offset) => ({
        item,
        ok: await isPlayable(item, start + offset + 1),
      }))
    );

    for (const result of results) {
      if (result.ok) playable.push(result.item);
      if (playable.length >= 1) break;
    }
  }

  playableCache = {
    expiresAt: now + PLAYABLE_CACHE_TTL_MS,
    items: playable,
  };

  return playable;
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

export async function GET() {
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
          data: [],
          items: [],
          cameras: [],
        },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const rawItems = getRawItems(payload);
    const playableItems = await pickPlayableItems(rawItems);
    const cameras = playableItems.slice(0, 1).map(normalizeCctv);

    return NextResponse.json({
      success: cameras.length === 1,
      count: cameras.length,
      rawCount: rawItems.length,
      selectedCount: playableItems.length,
      message: cameras.length === 1
        ? "Playable CCTV list fetched"
        : `Only ${cameras.length} playable CCTV streams found`,
      data: cameras,
      items: cameras,
      cameras,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "CCTV playable source selection failed",
        count: 0,
        data: [],
        items: [],
        cameras: [],
      },
      { status: 500 }
    );
  }
}
