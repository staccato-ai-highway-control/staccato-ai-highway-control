"use client";

import { useEffect, useMemo, useState } from "react";
import type { Cctv } from "@/types/cctv";
import { ORIGINAL_HEIGHT, ORIGINAL_WIDTH } from "@/features/cctvs/api";

type Bbox = {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence?: number;
};

type RawDetection = Record<string, unknown>;

const BBOX_POLL_INTERVAL_MS = 1000;
const AI_DETECTION_CAMERA_IDS = new Set(["camera-1", "camera-2"]);
const FALLBACK_DETECTION_WIDTH = 640;
const FALLBACK_DETECTION_HEIGHT = 360;

function parseCameraIdFromStreamUrl(streamUrl?: string) {
  if (!streamUrl) return undefined;

  const match = streamUrl.match(/\/api\/cctvs\/([^/?#]+)\/stream/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function getCameraId(cctv: Cctv) {
  return cctv.cameraId || parseCameraIdFromStreamUrl(cctv.streamUrl) || cctv.id;
}

function getBboxUrl(cctv: Cctv, cameraId: string) {
  return cctv.bboxWsUrl || "/api/cctvs/" + encodeURIComponent(cameraId) + "/bbox";
}

function getRawDetections(payload: unknown): RawDetection[] {
  if (Array.isArray(payload)) return payload as RawDetection[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const candidates = [record.detections, record.items, record.data, record.results, record.objects];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as RawDetection[];
  }

  if (record.data && typeof record.data === "object") {
    const nested = record.data as Record<string, unknown>;
    if (Array.isArray(nested.detections)) return nested.detections as RawDetection[];
    if (Array.isArray(nested.items)) return nested.items as RawDetection[];
  }

  return [];
}

function readNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function getFrameSizeFromRecord(record: Record<string, unknown>) {
  const width = readNumber(record.frame_width ?? record.frameWidth ?? record.image_width ?? record.imageWidth ?? record.width);
  const height = readNumber(record.frame_height ?? record.frameHeight ?? record.image_height ?? record.imageHeight ?? record.height);

  return width && height ? { width, height } : null;
}

function getDetectionFrameSize(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const record = payload as Record<string, unknown>;
  const direct = getFrameSizeFromRecord(record);
  if (direct) return direct;

  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    return getFrameSizeFromRecord(record.data as Record<string, unknown>);
  }

  return null;
}

function scaleBbox(bbox: Bbox, frameSize: { width: number; height: number } | null): Bbox {
  const looksNormalized = bbox.x >= 0 && bbox.y >= 0 && bbox.width > 0 && bbox.height > 0 && bbox.x <= 1 && bbox.y <= 1 && bbox.width <= 1 && bbox.height <= 1;

  if (looksNormalized) {
    return {
      ...bbox,
      x: bbox.x * ORIGINAL_WIDTH,
      y: bbox.y * ORIGINAL_HEIGHT,
      width: bbox.width * ORIGINAL_WIDTH,
      height: bbox.height * ORIGINAL_HEIGHT,
    };
  }

  const sourceSize = frameSize ?? (
    bbox.x + bbox.width <= FALLBACK_DETECTION_WIDTH && bbox.y + bbox.height <= FALLBACK_DETECTION_HEIGHT
      ? { width: FALLBACK_DETECTION_WIDTH, height: FALLBACK_DETECTION_HEIGHT }
      : null
  );

  if (!sourceSize || (sourceSize.width === ORIGINAL_WIDTH && sourceSize.height === ORIGINAL_HEIGHT)) return bbox;

  return {
    ...bbox,
    x: bbox.x * (ORIGINAL_WIDTH / sourceSize.width),
    y: bbox.y * (ORIGINAL_HEIGHT / sourceSize.height),
    width: bbox.width * (ORIGINAL_WIDTH / sourceSize.width),
    height: bbox.height * (ORIGINAL_HEIGHT / sourceSize.height),
  };
}

function normalizeBbox(detection: RawDetection, frameSize: { width: number; height: number } | null): Bbox | null {
  const bboxValue = detection.bbox ?? detection.box ?? detection.bounding_box ?? detection.boundingBox;
  let x = readNumber(detection.x ?? detection.left);
  let y = readNumber(detection.y ?? detection.top);
  let width = readNumber(detection.width ?? detection.w);
  let height = readNumber(detection.height ?? detection.h);

  if (Array.isArray(bboxValue)) {
    const [a, b, c, d] = bboxValue.map(readNumber);
    if ([a, b, c, d].every((value) => value !== undefined)) {
      x = a;
      y = b;
      if ((c ?? 0) > (a ?? 0) && (d ?? 0) > (b ?? 0)) {
        width = (c ?? 0) - (a ?? 0);
        height = (d ?? 0) - (b ?? 0);
      } else {
        width = c;
        height = d;
      }
    }
  } else if (bboxValue && typeof bboxValue === "object") {
    const bbox = bboxValue as Record<string, unknown>;
    const x1 = readNumber(bbox.x1 ?? bbox.left);
    const y1 = readNumber(bbox.y1 ?? bbox.top);
    const x2 = readNumber(bbox.x2 ?? bbox.right);
    const y2 = readNumber(bbox.y2 ?? bbox.bottom);

    x = readNumber(bbox.x ?? bbox.left) ?? x1 ?? x;
    y = readNumber(bbox.y ?? bbox.top) ?? y1 ?? y;
    width = readNumber(bbox.width ?? bbox.w) ?? (x1 !== undefined && x2 !== undefined ? x2 - x1 : width);
    height = readNumber(bbox.height ?? bbox.h) ?? (y1 !== undefined && y2 !== undefined ? y2 - y1 : height);
  }

  if (x === undefined || y === undefined || width === undefined || height === undefined || width <= 0 || height <= 0) {
    return null;
  }

  const label = String(detection.label ?? detection.class_name ?? detection.className ?? detection.type ?? detection.name ?? "object");
  const confidence = readNumber(detection.confidence ?? detection.score ?? detection.probability);

  return scaleBbox({ x, y, width, height, label, confidence }, frameSize);
}

function normalizeDetections(payload: unknown) {
  const frameSize = getDetectionFrameSize(payload);
  return getRawDetections(payload).map((detection) => normalizeBbox(detection, frameSize)).filter((bbox): bbox is Bbox => Boolean(bbox));
}

function formatConfidence(confidence?: number) {
  if (confidence === undefined) return "";
  return confidence <= 1 ? " " + Math.round(confidence * 100) + "%" : " " + Math.round(confidence) + "%";
}

export function BboxDetectionOverlay({ cctv, enabled }: { cctv: Cctv; enabled: boolean }) {
  const cameraId = useMemo(() => getCameraId(cctv), [cctv]);
  const bboxUrl = useMemo(() => getBboxUrl(cctv, cameraId), [cameraId, cctv]);
  const isDetectionSupported = AI_DETECTION_CAMERA_IDS.has(cameraId);
  const [detections, setDetections] = useState<Bbox[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDetections([]);
    setErrorMessage(null);
  }, [cameraId]);

  useEffect(() => {
    if (!enabled || !isDetectionSupported) return;

    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;

    async function poll() {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch(bboxUrl, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);

        if (!isMounted) return;

        if (!response.ok) {
          setErrorMessage("bbox 조회 실패: " + response.status);
          setDetections([]);
        } else {
          setErrorMessage(null);
          setDetections(normalizeDetections(payload));
        }
      } catch (error) {
        if (!isMounted || (error instanceof DOMException && error.name === "AbortError")) return;
        setErrorMessage(error instanceof Error ? error.message : "bbox 조회 실패");
        setDetections([]);
      } finally {
        if (isMounted) timeoutId = setTimeout(poll, BBOX_POLL_INTERVAL_MS);
      }
    }

    poll();

    return () => {
      isMounted = false;
      controller?.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [bboxUrl, enabled, isDetectionSupported]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="absolute inset-0 h-full w-full" viewBox={"0 0 " + ORIGINAL_WIDTH + " " + ORIGINAL_HEIGHT} preserveAspectRatio="none" aria-hidden="true">
        {detections.map((bbox, index) => (
          <g key={bbox.x + "-" + bbox.y + "-" + bbox.width + "-" + bbox.height + "-" + index}>
            <rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="none" stroke="#ef4444" strokeWidth="5" />
            <rect x={bbox.x} y={Math.max(0, bbox.y - 42)} width={Math.max(140, bbox.label ? bbox.label.length * 18 + 72 : 140)} height="42" fill="#ef4444" />
            <text x={bbox.x + 14} y={Math.max(28, bbox.y - 14)} fill="white" fontSize="28" fontWeight="800">
              {bbox.label}{formatConfidence(bbox.confidence)}
            </text>
          </g>
        ))}
      </svg>
      {!isDetectionSupported ? (
        <div className="absolute left-4 top-4 rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs font-bold text-amber-800 shadow-sm">
          AI VM 객체 탐지는 현재 camera-1, camera-2 worker 기준으로 설정되어 있습니다. 현재 {cameraId}는 bbox polling을 생략합니다.
        </div>
      ) : errorMessage ? (
        <div className="absolute left-4 top-4 rounded-lg border border-red-200 bg-red-50/95 px-3 py-2 text-xs font-bold text-red-700 shadow-sm">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
