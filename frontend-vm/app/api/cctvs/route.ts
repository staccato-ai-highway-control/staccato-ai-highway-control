import { NextResponse } from "next/server";

type RawCctvItem = Record<string, unknown>;

const MAX_CCTV_COUNT = 8;
const PROBE_TIMEOUT_MS = 12000;
const PROBE_LIMIT = 120;
const PROBE_BATCH_SIZE = 6;

const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ??
  process.env.NEXT_PUBLIC_AI_VM_BASE_URL ??
  "http://192.168.0.186:5001";

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRawCctvItem(value: unknown): value is RawCctvItem {
  return typeof value === "object" && value !== null;
}

function getRawItems(payload: unknown): RawCctvItem[] {
  if (Array.isArray(payload)) return payload.filter(isRawCctvItem);
  if (!isRawCctvItem(payload)) return [];

  const data = payload.data ?? payload.items ?? payload.cameras ?? payload.result;
  if (Array.isArray(data)) return data.filter(isRawCctvItem);
  if (isRawCctvItem(data)) {
    const nested = data.items ?? data.cameras ?? data.data ?? data.result;
    if (Array.isArray(nested)) return nested.filter(isRawCctvItem);
  }

  return [];
}

function pickSourceUrl(item: RawCctvItem) {
  return (
    getString(item.sourceUrl) ??
    getString(item.source_url) ??
    getString(item.streamUrl) ??
    getString(item.stream_url) ??
    getString(item.url) ??
    getString(item.cctvurl) ??
    getString(item.cctv_url) ??
    getString(item.videoUrl) ??
    getString(item.video_url) ??
    getString(item.mjpegUrl) ??
    getString(item.mjpeg_url)
  );
}

function normalizeStatus(status: unknown, active: unknown) {
  if (status === "ACTIVE") return "ONLINE";
  if (status === "INACTIVE") return "OFFLINE";
  if (status === "MAINTENANCE") return "MAINTENANCE";
  if (status === "ONLINE" || status === "OFFLINE") return status;
  if (active === false || active === 0) return "OFFLINE";
  return "ONLINE";
}

function buildCameraId(item: RawCctvItem, index: number) {
  return String(item.camera_id ?? item.cameraId ?? "camera-" + (index + 1));
}

function buildCctvCode(item: RawCctvItem, index: number) {
  return String(
    item.cctvCode ??
      item.cctv_code ??
      item.id ??
      "CCTV-" + String(index + 1).padStart(3, "0")
  );
}

function buildStreamUrl(cameraId: string, sourceUrl?: string) {
  if (!sourceUrl) return undefined;
  return "/api/cctvs/" + encodeURIComponent(cameraId) + "/stream?source_url=" + encodeURIComponent(sourceUrl);
}

function normalizeCctv(item: RawCctvItem, index: number) {
  const sourceUrl = pickSourceUrl(item);
  const cameraId = buildCameraId(item, index);
  const cctvCode = buildCctvCode(item, index);
  const name = String(item.name ?? item.cctv_name ?? item.camera_name ?? cctvCode);
  const roadName = String(item.roadName ?? item.road_name ?? item.road ?? "STACCATO 고속도로");
  const locationName = String(item.locationName ?? item.location_name ?? item.location ?? name);
  const active = item.active ?? item.is_active;
  const streamUrl = buildStreamUrl(cameraId, sourceUrl);

  return {
    ...item,
    id: cctvCode,
    camera_id: cameraId,
    cctvCode,
    cctv_code: cctvCode,
    name,
    cctv_name: item.cctv_name ?? name,
    road: item.road ?? roadName,
    roadName,
    road_name: item.road_name ?? roadName,
    location: item.location ?? locationName,
    locationName,
    location_name: item.location_name ?? locationName,
    direction: item.direction ?? "-",
    status: normalizeStatus(item.status, active),
    streamUrl,
    stream_url: streamUrl,
    imageUrl: item.imageUrl ?? "/api/cctvs/" + encodeURIComponent(cameraId) + "/snapshot",
    snapshotUrl: item.snapshotUrl ?? "/api/cctvs/" + encodeURIComponent(cameraId) + "/snapshot",
    sourceUrl,
    isLive: Boolean(streamUrl),
    isAiDetected: item.isAiDetected ?? false,
    detectionType: item.detectionType,
    confidence: item.confidence,
    lastUpdatedAt: item.lastUpdatedAt ?? item.updated_at ?? item.created_at ?? item.file_create_time ?? "-",
    roiTypes: item.roiTypes ?? [],
    original: item.original ?? item,
  };
}

async function canPlayStream(item: RawCctvItem) {
  const sourceUrl = pickSourceUrl(item);
  if (!sourceUrl) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(sourceUrl, {
      headers: { Range: "bytes=0-1" },
      signal: controller.signal,
      cache: "no-store",
    });
    const isPlayable = response.ok || response.status === 206 || response.status === 302;
    await response.body?.cancel().catch(() => undefined);
    return isPlayable;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function pickPlayableItems(rawItems: RawCctvItem[]) {
  const probeItems = rawItems.filter((item) => pickSourceUrl(item)).slice(0, PROBE_LIMIT);
  const playableItems: RawCctvItem[] = [];

  for (let index = 0; index < probeItems.length; index += PROBE_BATCH_SIZE) {
    const batch = probeItems.slice(index, index + PROBE_BATCH_SIZE);
    const results = await Promise.all(batch.map((item) => canPlayStream(item)));
    results.forEach((isPlayable, resultIndex) => {
      if (isPlayable) playableItems.push(batch[resultIndex]);
    });
  }

  return playableItems;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const queryString = requestUrl.searchParams.toString();
    const upstreamUrl = AI_VM_BASE_URL.replace(/\/$/, "") + "/traffic/api/cctv" + (queryString ? "?" + queryString : "");
    const response = await fetch(upstreamUrl, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          count: 0,
          rawCount: 0,
          playableCount: 0,
          selectedCount: 0,
          message: "CCTV list request failed: " + response.status,
          data: [],
          items: [],
          cameras: [],
        },
        { status: response.status }
      );
    }

    const payload = await response.json();
    const rawItems = getRawItems(payload);
    const candidates = rawItems.filter((item) => pickSourceUrl(item));
    const playableItems = await pickPlayableItems(rawItems);
    const selectedItems = [
      ...playableItems,
      ...candidates.filter((item) => !playableItems.includes(item)),
    ].slice(0, MAX_CCTV_COUNT);
    const cameras = selectedItems.map(normalizeCctv);

    return NextResponse.json({
      success: cameras.length === MAX_CCTV_COUNT,
      count: cameras.length,
      rawCount: rawItems.length,
      playableCount: playableItems.length,
      selectedCount: selectedItems.length,
      message:
        cameras.length === MAX_CCTV_COUNT
          ? "CCTV list fetched. " + playableItems.length + " streams verified as playable."
          : "Only " + cameras.length + " CCTV stream sources found",
      data: cameras,
      items: cameras,
      cameras,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        count: 0,
        rawCount: 0,
        playableCount: 0,
        selectedCount: 0,
        message: "CCTV list request failed",
        data: [],
        items: [],
        cameras: [],
      },
      { status: 502 }
    );
  }
}
