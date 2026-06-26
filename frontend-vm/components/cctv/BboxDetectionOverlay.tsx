"use client";

import { useEffect, useMemo, useState } from "react";
import type { Cctv } from "@/types/cctv";

type FrameSize = {
  width: number;
  height: number;
};

type Bbox = {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence?: number;
};

type OverlayState = {
  frameSize: FrameSize;
  detections: Bbox[];
};

type RawDetection = Record<string, unknown>;

const BBOX_POLL_INTERVAL_MS = 1000;

// AI-vm stream/ring buffer 기본 출력 크기.
// API 응답에 frame_width/frame_height가 없을 때만 fallback으로 사용합니다.
const DEFAULT_FRAME_SIZE: FrameSize = {
  width: 960,
  height: 540,
};

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

function readNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function getBboxMetadata(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const direct = record.bbox_metadata ?? record.bboxMetadata;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct as Record<string, unknown>;
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    const data = record.data as Record<string, unknown>;
    const nested = data.bbox_metadata ?? data.bboxMetadata;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Record<string, unknown>;
    if ((data.frame_width ?? data.frameWidth) !== undefined && (data.frame_height ?? data.frameHeight) !== undefined && (data.bbox_format ?? data.bboxFormat) !== undefined) return data;
  }
  if ((record.frame_width ?? record.frameWidth) !== undefined && (record.frame_height ?? record.frameHeight) !== undefined && (record.bbox_format ?? record.bboxFormat) !== undefined) return record;
  return null;
}

function hasDetectionArray(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Array.isArray(payload);
  const record = payload as Record<string, unknown>;
  const metadata = getBboxMetadata(payload);
  if ([record.detections, record.items, record.results, record.objects, metadata?.detections, metadata?.items].some(Array.isArray)) return true;
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    const data = record.data as Record<string, unknown>;
    return [data.detections, data.items, data.results, data.objects].some(Array.isArray);
  }
  return false;
}

function getRawDetections(payload: unknown): RawDetection[] {
  if (Array.isArray(payload)) return payload as RawDetection[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const metadata = getBboxMetadata(payload);
  const candidates = [record.detections, record.items, record.results, record.objects, metadata?.detections, metadata?.items];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as RawDetection[];
  }

  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    const nested = record.data as Record<string, unknown>;
    if (Array.isArray(nested.detections)) return nested.detections as RawDetection[];
    if (Array.isArray(nested.items)) return nested.items as RawDetection[];
  }

  return [];
}

function getFrameSizeFromRecord(record: Record<string, unknown>): FrameSize | null {
  const width = readNumber(
    record.frame_width ??
      record.frameWidth ??
      record.image_width ??
      record.imageWidth ??
      record.width
  );
  const height = readNumber(
    record.frame_height ??
      record.frameHeight ??
      record.image_height ??
      record.imageHeight ??
      record.height
  );

  return width && height && width > 0 && height > 0 ? { width, height } : null;
}

function getDetectionFrameSize(payload: unknown): FrameSize | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const metadata = getBboxMetadata(payload);
  if (metadata) {
    const metadataSize = getFrameSizeFromRecord(metadata);
    if (metadataSize) return metadataSize;
  }
  const direct = getFrameSizeFromRecord(record);
  if (direct) return direct;

  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    const nested = getFrameSizeFromRecord(record.data as Record<string, unknown>);
    if (nested) return nested;
  }

  return null;
}

function getBboxFormat(payload: unknown): "xyxy" | "xywh" | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const metadata = getBboxMetadata(payload);
  const metadataFormat = String(metadata?.bbox_format ?? metadata?.bboxFormat ?? "").toLowerCase();
  if (metadataFormat === "xyxy" || metadataFormat === "xywh") return metadataFormat;
  const direct = String(record.bbox_format ?? record.bboxFormat ?? "").toLowerCase();
  if (direct === "xyxy" || direct === "xywh") return direct;

  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    const nested = record.data as Record<string, unknown>;
    const nestedFormat = String(nested.bbox_format ?? nested.bboxFormat ?? "").toLowerCase();
    if (nestedFormat === "xyxy" || nestedFormat === "xywh") return nestedFormat;
  }

  return null;
}

function normalizeBbox(detection: RawDetection, frameSize: FrameSize, payloadBboxFormat: "xyxy" | "xywh" | null): Bbox | null {
  const bboxValue = detection.bbox ?? detection.box ?? detection.bounding_box ?? detection.boundingBox;
  let x = readNumber(detection.x ?? detection.left);
  let y = readNumber(detection.y ?? detection.top);
  let width = readNumber(detection.width ?? detection.w);
  let height = readNumber(detection.height ?? detection.h);

  if (Array.isArray(bboxValue)) {
    const [a, b, c, d] = bboxValue.map(readNumber);
    const detectionFormat = String(detection.bbox_format ?? detection.bboxFormat ?? "").toLowerCase();
    const bboxFormat = detectionFormat === "xyxy" || detectionFormat === "xywh" ? detectionFormat : payloadBboxFormat;

    if ([a, b, c, d].every((value) => value !== undefined)) {
      x = a;
      y = b;

      if (bboxFormat === "xyxy") {
        width = (c ?? 0) - (a ?? 0);
        height = (d ?? 0) - (b ?? 0);
      } else if (bboxFormat === "xywh") {
        width = c;
        height = d;
      } else {
        return null;
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

  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  // 정규화 좌표만 현재 frameSize로 변환합니다.
  // 이미 픽셀 좌표인 bbox는 절대 ORIGINAL_WIDTH/HEIGHT로 재스케일하지 않습니다.
  const looksNormalized =
    x >= 0 &&
    y >= 0 &&
    width > 0 &&
    height > 0 &&
    x <= 1 &&
    y <= 1 &&
    width <= 1 &&
    height <= 1;

  const normalized = looksNormalized
    ? {
        x: x * frameSize.width,
        y: y * frameSize.height,
        width: width * frameSize.width,
        height: height * frameSize.height,
      }
    : { x, y, width, height };

  const label = String(
    detection.label ??
      detection.class_name ??
      detection.className ??
      detection.type ??
      detection.name ??
      "object"
  );
  const confidence = readNumber(detection.confidence ?? detection.score ?? detection.probability);

  return {
    ...normalized,
    label,
    confidence,
  };
}

function normalizeOverlayState(payload: unknown): OverlayState {
  if (!getBboxMetadata(payload)) throw new Error("응답 형식 오류: bbox metadata가 없습니다.");
  const frameSize = getDetectionFrameSize(payload);
  const bboxFormat = getBboxFormat(payload);
  if (!frameSize) throw new Error("응답 형식 오류: frame_width와 frame_height가 없습니다.");
  if (!bboxFormat) throw new Error("응답 형식 오류: bbox_format이 없습니다.");
  if (!hasDetectionArray(payload)) throw new Error("응답 형식 오류: detections 배열이 없습니다.");

  const detections = getRawDetections(payload)
    .map((detection) => normalizeBbox(detection, frameSize, bboxFormat))
    .filter((bbox): bbox is Bbox => Boolean(bbox));

  return {
    frameSize,
    detections,
  };
}

function formatConfidence(confidence?: number) {
  if (confidence === undefined) return "";
  return confidence <= 1 ? " " + Math.round(confidence * 100) + "%" : " " + Math.round(confidence) + "%";
}

export function BboxDetectionOverlay({ cctv, enabled }: { cctv: Cctv; enabled: boolean }) {
  const cameraId = useMemo(() => getCameraId(cctv), [cctv]);
  const bboxUrl = useMemo(() => getBboxUrl(cctv, cameraId), [cameraId, cctv]);
  const [overlayState, setOverlayState] = useState<OverlayState>({
    frameSize: DEFAULT_FRAME_SIZE,
    detections: [],
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setOverlayState({
      frameSize: DEFAULT_FRAME_SIZE,
      detections: [],
    });
    setErrorMessage(null);
  }, [cameraId]);

  useEffect(() => {
    if (!enabled) {
      setOverlayState((current) => ({ ...current, detections: [] }));
      return;
    }

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
        const payload = await response.json().catch(() => { throw new Error("응답 형식 오류: JSON을 파싱할 수 없습니다."); });

        if (!isMounted) return;

        if (!response.ok) {
          setErrorMessage("bbox 조회 실패: " + response.status);
          setOverlayState((current) => ({ ...current, detections: [] }));
        } else {
          setErrorMessage(null);
          setOverlayState(normalizeOverlayState(payload));
        }
      } catch (error) {
        if (!isMounted || (error instanceof DOMException && error.name === "AbortError")) return;
        setErrorMessage(error instanceof Error ? error.message : "bbox 조회 실패");
        setOverlayState((current) => ({ ...current, detections: [] }));
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
  }, [bboxUrl, enabled]);

  if (!enabled) return null;

  const { frameSize, detections } = overlayState;

  return (
    <div className="pointer-events-none absolute inset-0">
      {detections.map((bbox, index) => {
        const left = (bbox.x / frameSize.width) * 100;
        const top = (bbox.y / frameSize.height) * 100;
        const width = (bbox.width / frameSize.width) * 100;
        const height = (bbox.height / frameSize.height) * 100;

        return (
          <div
            key={bbox.x + "-" + bbox.y + "-" + bbox.width + "-" + bbox.height + "-" + index}
            className="absolute"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          >
            <div className="absolute inset-0 border-[3px] border-red-500" />
            <div className="absolute left-0 top-0 -translate-y-full whitespace-nowrap bg-red-500 px-2 py-1 text-sm font-extrabold leading-none text-white">
              {bbox.label}{formatConfidence(bbox.confidence)}
            </div>
          </div>
        );
      })}
      {errorMessage ? (
        <div className="absolute left-4 top-4 rounded-lg border border-red-200 bg-red-50/95 px-3 py-2 text-xs font-bold text-red-700 shadow-sm">
          {errorMessage}
        </div>
      ) : detections.length === 0 ? (
        <div className="absolute left-4 top-4 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
          탐지된 객체가 없습니다.
        </div>
      ) : null}
    </div>
  );
}
