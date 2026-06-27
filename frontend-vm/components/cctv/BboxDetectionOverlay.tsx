/**
 * 파일 역할: CCTV 영역에서 사용하는 BboxDetectionOverlay UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useState } from "react";
// 코드 설명: @/types/cctv 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Cctv } from "@/types/cctv";

// 코드 설명: FrameSize 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type FrameSize = {
  width: number;
  height: number;
};

// 코드 설명: Bbox 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type Bbox = {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence?: number;
};

// 코드 설명: OverlayState 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type OverlayState = {
  frameSize: FrameSize;
  detections: Bbox[];
};

// 코드 설명: RawDetection 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RawDetection = Record<string, unknown>;

// 코드 설명: BBOX_POLL_INTERVAL_MS 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const BBOX_POLL_INTERVAL_MS = 1000;

// AI-vm stream/ring buffer 기본 출력 크기.
// API 응답에 frame_width/frame_height가 없을 때만 fallback으로 사용합니다.
const DEFAULT_FRAME_SIZE: FrameSize = {
  width: 960,
  height: 540,
};

// 코드 설명: parseCameraIdFromStreamUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function parseCameraIdFromStreamUrl(streamUrl?: string) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !streamUrl
  if (!streamUrl) return undefined;

  // 코드 설명: match 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const match = streamUrl.match(/\/api\/cctvs\/([^/?#]+)\/stream/);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: match ? decodeURIComponent(match[1]) : undefined
  return match ? decodeURIComponent(match[1]) : undefined;
}

// 코드 설명: getCameraId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getCameraId(cctv: Cctv) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: cctv.cameraId || parseCameraIdFromStreamUrl(cctv.streamUrl) || cctv.id
  return cctv.cameraId || parseCameraIdFromStreamUrl(cctv.streamUrl) || cctv.id;
}

// 코드 설명: getBboxUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getBboxUrl(cctv: Cctv, cameraId: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: cctv.bboxWsUrl || "/api/cctvs/" + encodeURIComponent(cameraId) + "/bbox"
  return cctv.bboxWsUrl || "/api/cctvs/" + encodeURIComponent(cameraId) + "/bbox";
}

// 코드 설명: readNumber 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function readNumber(value: unknown) {
  // 코드 설명: number 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const number = Number(value);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Number.isFinite(number) ? number : undefined
  return Number.isFinite(number) ? number : undefined;
}

// 코드 설명: getBboxMetadata 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getBboxMetadata(payload: unknown): Record<string, unknown> | null {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !payload || typeof payload !== "object" || Array.isArray(payload)
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  // 코드 설명: record 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const record = payload as Record<string, unknown>;
  // 코드 설명: direct 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const direct = record.bbox_metadata ?? record.bboxMetadata;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: direct && typeof direct === "object" && !Array.isArray(direct)
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct as Record<string, unknown>;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: record.data && typeof record.data === "object" && !Array.isArray(record…
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const data = record.data as Record<string, unknown>;
    // 코드 설명: nested 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const nested = data.bbox_metadata ?? data.bboxMetadata;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: nested && typeof nested === "object" && !Array.isArray(nested)
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Record<string, unknown>;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: (data.frame_width ?? data.frameWidth) !== undefined && (data.frame_heig…
    if ((data.frame_width ?? data.frameWidth) !== undefined && (data.frame_height ?? data.frameHeight) !== undefined && (data.bbox_format ?? data.bboxFormat) !== undefined) return data;
  }
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: (record.frame_width ?? record.frameWidth) !== undefined && (record.fram…
  if ((record.frame_width ?? record.frameWidth) !== undefined && (record.frame_height ?? record.frameHeight) !== undefined && (record.bbox_format ?? record.bboxFormat) !== undefined) return record;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
  return null;
}

// 코드 설명: hasDetectionArray 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function hasDetectionArray(payload: unknown) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !payload || typeof payload !== "object" || Array.isArray(payload)
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Array.isArray(payload);
  // 코드 설명: record 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const record = payload as Record<string, unknown>;
  // 코드 설명: metadata 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const metadata = getBboxMetadata(payload);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: [record.detections, record.items, record.results, record.objects, metad…
  if ([record.detections, record.items, record.results, record.objects, metadata?.detections, metadata?.items].some(Array.isArray)) return true;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: record.data && typeof record.data === "object" && !Array.isArray(record…
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const data = record.data as Record<string, unknown>;
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: [data.detections, data.items, data.results, data.objects].some(Array.is…
    return [data.detections, data.items, data.results, data.objects].some(Array.isArray);
  }
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: false
  return false;
}

// 코드 설명: getRawDetections 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getRawDetections(payload: unknown): RawDetection[] {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(payload)
  if (Array.isArray(payload)) return payload as RawDetection[];
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !payload || typeof payload !== "object"
  if (!payload || typeof payload !== "object") return [];

  // 코드 설명: record 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const record = payload as Record<string, unknown>;
  // 코드 설명: metadata 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const metadata = getBboxMetadata(payload);
  // 코드 설명: candidates 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const candidates = [record.detections, record.items, record.results, record.objects, metadata?.detections, metadata?.items];

  // 코드 설명: 목록 또는 조건을 순회하면서 각 항목에 같은 처리 규칙을 적용합니다.
  for (const candidate of candidates) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(candidate)
    if (Array.isArray(candidate)) return candidate as RawDetection[];
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: record.data && typeof record.data === "object" && !Array.isArray(record…
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    // 코드 설명: nested 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const nested = record.data as Record<string, unknown>;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(nested.detections)
    if (Array.isArray(nested.detections)) return nested.detections as RawDetection[];
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(nested.items)
    if (Array.isArray(nested.items)) return nested.items as RawDetection[];
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: []
  return [];
}

// 코드 설명: getFrameSizeFromRecord 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getFrameSizeFromRecord(record: Record<string, unknown>): FrameSize | null {
  // 코드 설명: width 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const width = readNumber(
    record.frame_width ??
      record.frameWidth ??
      record.image_width ??
      record.imageWidth ??
      record.width
  );
  // 코드 설명: height 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const height = readNumber(
    record.frame_height ??
      record.frameHeight ??
      record.image_height ??
      record.imageHeight ??
      record.height
  );

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: width && height && width > 0 && height > 0 ? { width, height } : null
  return width && height && width > 0 && height > 0 ? { width, height } : null;
}

// 코드 설명: getDetectionFrameSize 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getDetectionFrameSize(payload: unknown): FrameSize | null {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !payload || typeof payload !== "object" || Array.isArray(payload)
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
    return null;
  }

  // 코드 설명: record 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const record = payload as Record<string, unknown>;
  // 코드 설명: metadata 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const metadata = getBboxMetadata(payload);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: metadata
  if (metadata) {
    // 코드 설명: metadataSize 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const metadataSize = getFrameSizeFromRecord(metadata);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: metadataSize
    if (metadataSize) return metadataSize;
  }
  // 코드 설명: direct 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const direct = getFrameSizeFromRecord(record);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: direct
  if (direct) return direct;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: record.data && typeof record.data === "object" && !Array.isArray(record…
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    // 코드 설명: nested 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const nested = getFrameSizeFromRecord(record.data as Record<string, unknown>);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: nested
    if (nested) return nested;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
  return null;
}

// 코드 설명: getBboxFormat 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getBboxFormat(payload: unknown): "xyxy" | "xywh" | null {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !payload || typeof payload !== "object" || Array.isArray(payload)
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
    return null;
  }

  // 코드 설명: record 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const record = payload as Record<string, unknown>;
  // 코드 설명: metadata 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const metadata = getBboxMetadata(payload);
  // 코드 설명: metadataFormat 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const metadataFormat = String(metadata?.bbox_format ?? metadata?.bboxFormat ?? "").toLowerCase();
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: metadataFormat === "xyxy" || metadataFormat === "xywh"
  if (metadataFormat === "xyxy" || metadataFormat === "xywh") return metadataFormat;
  // 코드 설명: direct 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const direct = String(record.bbox_format ?? record.bboxFormat ?? "").toLowerCase();
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: direct === "xyxy" || direct === "xywh"
  if (direct === "xyxy" || direct === "xywh") return direct;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: record.data && typeof record.data === "object" && !Array.isArray(record…
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    // 코드 설명: nested 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const nested = record.data as Record<string, unknown>;
    // 코드 설명: nestedFormat 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const nestedFormat = String(nested.bbox_format ?? nested.bboxFormat ?? "").toLowerCase();
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: nestedFormat === "xyxy" || nestedFormat === "xywh"
    if (nestedFormat === "xyxy" || nestedFormat === "xywh") return nestedFormat;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
  return null;
}

// 코드 설명: normalizeBbox 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeBbox(detection: RawDetection, frameSize: FrameSize, payloadBboxFormat: "xyxy" | "xywh" | null): Bbox | null {
  // 코드 설명: bboxValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const bboxValue = detection.bbox ?? detection.box ?? detection.bounding_box ?? detection.boundingBox;
  // 코드 설명: x 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  let x = readNumber(detection.x ?? detection.left);
  // 코드 설명: y 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  let y = readNumber(detection.y ?? detection.top);
  // 코드 설명: width 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  let width = readNumber(detection.width ?? detection.w);
  // 코드 설명: height 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  let height = readNumber(detection.height ?? detection.h);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(bboxValue)
  if (Array.isArray(bboxValue)) {
    // 코드 설명: [a, b, c, d] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const [a, b, c, d] = bboxValue.map(readNumber);
    // 코드 설명: detectionFormat 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const detectionFormat = String(detection.bbox_format ?? detection.bboxFormat ?? "").toLowerCase();
    // 코드 설명: bboxFormat 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const bboxFormat = detectionFormat === "xyxy" || detectionFormat === "xywh" ? detectionFormat : payloadBboxFormat;

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: [a, b, c, d].every((value) => value !== undefined)
    if ([a, b, c, d].every((value) => value !== undefined)) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: x = a;
      x = a;
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: y = b;
      y = b;

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: bboxFormat === "xyxy"
      if (bboxFormat === "xyxy") {
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: width = (c ?? 0) - (a ?? 0);
        width = (c ?? 0) - (a ?? 0);
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: height = (d ?? 0) - (b ?? 0);
        height = (d ?? 0) - (b ?? 0);
      } else if (bboxFormat === "xywh") {
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: width = c;
        width = c;
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: height = d;
        height = d;
      } else {
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
        return null;
      }
    }
  } else if (bboxValue && typeof bboxValue === "object") {
    // 코드 설명: bbox 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const bbox = bboxValue as Record<string, unknown>;
    // 코드 설명: x1 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const x1 = readNumber(bbox.x1 ?? bbox.left);
    // 코드 설명: y1 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const y1 = readNumber(bbox.y1 ?? bbox.top);
    // 코드 설명: x2 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const x2 = readNumber(bbox.x2 ?? bbox.right);
    // 코드 설명: y2 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const y2 = readNumber(bbox.y2 ?? bbox.bottom);

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: x = readNumber(bbox.x ?? bbox.left) ?? x1 ?? x;
    x = readNumber(bbox.x ?? bbox.left) ?? x1 ?? x;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: y = readNumber(bbox.y ?? bbox.top) ?? y1 ?? y;
    y = readNumber(bbox.y ?? bbox.top) ?? y1 ?? y;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: width = readNumber(bbox.width ?? bbox.w) ?? (x1 !== undefined && x2 !==…
    width = readNumber(bbox.width ?? bbox.w) ?? (x1 !== undefined && x2 !== undefined ? x2 - x1 : width);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: height = readNumber(bbox.height ?? bbox.h) ?? (y1 !== undefined && y2 !…
    height = readNumber(bbox.height ?? bbox.h) ?? (y1 !== undefined && y2 !== undefined ? y2 - y1 : height);
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: x === undefined || y === undefined || width === undefined || height ===…
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0
  ) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
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

  // 코드 설명: normalized 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const normalized = looksNormalized
    ? {
        x: x * frameSize.width,
        y: y * frameSize.height,
        width: width * frameSize.width,
        height: height * frameSize.height,
      }
    : { x, y, width, height };

  // 코드 설명: label 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const label = String(
    detection.label ??
      detection.class_name ??
      detection.className ??
      detection.type ??
      detection.name ??
      "object"
  );
  // 코드 설명: confidence 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const confidence = readNumber(detection.confidence ?? detection.score ?? detection.probability);

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { ...normalized, label, confidence, }
  return {
    ...normalized,
    label,
    confidence,
  };
}

// 코드 설명: normalizeOverlayState 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeOverlayState(payload: unknown): OverlayState {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !getBboxMetadata(payload)
  if (!getBboxMetadata(payload)) throw new Error("응답 형식 오류: bbox metadata가 없습니다.");
  // 코드 설명: frameSize 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const frameSize = getDetectionFrameSize(payload);
  // 코드 설명: bboxFormat 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const bboxFormat = getBboxFormat(payload);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !frameSize
  if (!frameSize) throw new Error("응답 형식 오류: frame_width와 frame_height가 없습니다.");
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !bboxFormat
  if (!bboxFormat) throw new Error("응답 형식 오류: bbox_format이 없습니다.");
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !hasDetectionArray(payload)
  if (!hasDetectionArray(payload)) throw new Error("응답 형식 오류: detections 배열이 없습니다.");

  // 코드 설명: detections 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const detections = getRawDetections(payload)
    .map((detection) => normalizeBbox(detection, frameSize, bboxFormat))
    .filter((bbox): bbox is Bbox => Boolean(bbox));

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { frameSize, detections, }
  return {
    frameSize,
    detections,
  };
}

// 코드 설명: formatConfidence 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatConfidence(confidence?: number) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: confidence === undefined
  if (confidence === undefined) return "";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: confidence <= 1 ? " " + Math.round(confidence * 100) + "%" : " " + Math…
  return confidence <= 1 ? " " + Math.round(confidence * 100) + "%" : " " + Math.round(confidence) + "%";
}

// 코드 설명: BboxDetectionOverlay 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function BboxDetectionOverlay({ cctv, enabled }: { cctv: Cctv; enabled: boolean }) {
  // 코드 설명: cameraId 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const cameraId = useMemo(() => getCameraId(cctv), [cctv]);
  // 코드 설명: bboxUrl 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const bboxUrl = useMemo(() => getBboxUrl(cctv, cameraId), [cameraId, cctv]);
  // 코드 설명: [overlayState, setOverlayState] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [overlayState, setOverlayState] = useState<OverlayState>({
    frameSize: DEFAULT_FRAME_SIZE,
    detections: [],
  });
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setOverlayState 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setOverlayState({
      frameSize: DEFAULT_FRAME_SIZE,
      detections: [],
    });
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);
  }, [cameraId]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !enabled
    if (!enabled) {
      // 코드 설명: setOverlayState 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setOverlayState((current) => ({ ...current, detections: [] }));
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: isMounted 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let isMounted = true;
    // 코드 설명: timeoutId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    // 코드 설명: controller 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let controller: AbortController | null = null;

    // 코드 설명: poll 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function poll() {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: controller?.abort();
      controller?.abort();
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: controller = new AbortController();
      controller = new AbortController();

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const response = await fetch(bboxUrl, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        // 코드 설명: payload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const payload = await response.json().catch(() => { throw new Error("응답 형식 오류: JSON을 파싱할 수 없습니다."); });

        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isMounted
        if (!isMounted) return;

        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !response.ok
        if (!response.ok) {
          // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setErrorMessage("bbox 조회 실패: " + response.status);
          // 코드 설명: setOverlayState 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setOverlayState((current) => ({ ...current, detections: [] }));
        } else {
          // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setErrorMessage(null);
          // 코드 설명: setOverlayState 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setOverlayState(normalizeOverlayState(payload));
        }
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isMounted || (error instanceof DOMException && error.name === "AbortEr…
        if (!isMounted || (error instanceof DOMException && error.name === "AbortError")) return;
        // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setErrorMessage(error instanceof Error ? error.message : "bbox 조회 실패");
        // 코드 설명: setOverlayState 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setOverlayState((current) => ({ ...current, detections: [] }));
      } finally {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isMounted
        if (isMounted) timeoutId = setTimeout(poll, BBOX_POLL_INTERVAL_MS);
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: poll();
    poll();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { isMounted = false; controller?.abort(); if (timeoutId) clearTim…
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: isMounted = false;
      isMounted = false;
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: controller?.abort();
      controller?.abort();
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: timeoutId
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [bboxUrl, enabled]);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !enabled
  if (!enabled) return null;

  // 코드 설명: { frameSize, detections } 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const { frameSize, detections } = overlayState;

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="pointer-events-none absolute inset-0">
      {detections.map((bbox, index) => {
        // 코드 설명: left 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const left = (bbox.x / frameSize.width) * 100;
        // 코드 설명: top 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const top = (bbox.y / frameSize.height) * 100;
        // 코드 설명: width 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const width = (bbox.width / frameSize.width) * 100;
        // 코드 설명: height 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const height = (bbox.height / frameSize.height) * 100;

        // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
