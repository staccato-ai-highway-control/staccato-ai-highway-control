"use client";

import { useEffect, useMemo, useState } from "react";
import type { Cctv } from "@/types/cctv";

type RawDetection = Record<string, unknown>;

type BboxDetection = {
  bbox: [number, number, number, number];
  label?: string;
  confidence?: number;
};

const statusLabels = {
  ONLINE: "정상",
  OFFLINE: "연결 끊김",
  MAINTENANCE: "점검중",
} as const;

const statusClasses = {
  ONLINE: "border-emerald-300 text-emerald-600",
  OFFLINE: "border-red-300 text-red-600",
  MAINTENANCE: "border-yellow-300 text-yellow-600",
} as const;

const cardBorderClasses = {
  ONLINE: "border-emerald-300 hover:border-emerald-400",
  OFFLINE: "border-red-300 hover:border-red-400",
  MAINTENANCE: "border-yellow-300 hover:border-yellow-400",
} as const;

function getCctvSceneClass(index: number) {
  const scenes = [
    "from-emerald-950 via-slate-700 to-sky-200",
    "from-slate-800 via-slate-500 to-cyan-100",
    "from-emerald-950 via-teal-700 to-cyan-100",
    "from-slate-900 via-slate-600 to-orange-100",
    "from-slate-800 via-cyan-800 to-yellow-100",
    "from-slate-900 via-slate-600 to-slate-300",
    "from-emerald-950 via-slate-700 to-cyan-100",
    "from-green-900 via-teal-600 to-cyan-100",
  ];

  return scenes[index % scenes.length];
}

function getCctvCameraId(cctv: Cctv) {
  const anyCctv = cctv as Cctv & Record<string, unknown>;
  const value = anyCctv.cameraId ?? anyCctv.camera_id ?? cctv.id ?? cctv.cctvCode;
  return value ? String(value) : "";
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getRawDetections(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.detections)) return record.detections;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.cameras)) return record.cameras;

  const data = record.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const dataRecord = data as Record<string, unknown>;
    if (Array.isArray(dataRecord.detections)) return dataRecord.detections;
    if (Array.isArray(dataRecord.items)) return dataRecord.items;
  }

  return [];
}

function normalizeDetection(value: unknown): BboxDetection | null {
  if (!value || typeof value !== "object") return null;
  const detection = value as RawDetection;
  const rawBbox = detection.bbox ?? detection.box;
  if (!Array.isArray(rawBbox) || rawBbox.length < 4) return null;

  const [x1, y1, x2, y2] = rawBbox.map(getNumber);
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null;
  if (x2 <= x1 || y2 <= y1) return null;

  return {
    bbox: [x1, y1, x2, y2],
    label:
      getString(detection.class_name) ??
      getString(detection.className) ??
      getString(detection.object_type) ??
      getString(detection.label),
    confidence: getNumber(detection.confidence),
  };
}

function getDetectionLabel(detection: BboxDetection) {
  const label = detection.label ?? "object";
  if (detection.confidence === undefined) return label;
  return label + " " + Math.round(detection.confidence * 100) + "%";
}

function BboxOverlay({ detections }: { detections: BboxDetection[] }) {
  if (detections.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {detections.map((detection, index) => {
        const [x1, y1, x2, y2] = detection.bbox;
        const label = getDetectionLabel(detection);

        return (
          <g key={index}>
            <rect
              x={x1}
              y={y1}
              width={x2 - x1}
              height={y2 - y1}
              fill="none"
              stroke="rgb(255,90,82)"
              strokeWidth={4}
            />
            <text
              x={x1}
              y={Math.max(24, y1 - 8)}
              fill="white"
              fontSize={28}
              fontWeight={800}
              paintOrder="stroke"
              stroke="rgb(15,23,42)"
              strokeWidth={6}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CctvFrame({
  cctv,
  index = 0,
  large = false,
}: {
  cctv: Cctv;
  index?: number;
  large?: boolean;
}) {
  const [detections, setDetections] = useState<BboxDetection[]>([]);
  const [streamFailed, setStreamFailed] = useState(false);
  const cameraId = useMemo(() => getCctvCameraId(cctv), [cctv]);

  useEffect(() => {
    setStreamFailed(false);
  }, [cctv.streamUrl]);

  useEffect(() => {
    if (!cameraId) {
      setDetections([]);
      return;
    }

    let isMounted = true;
    let controller: AbortController | null = null;

    async function fetchDetections() {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch("/api/cctvs/" + encodeURIComponent(cameraId) + "/bbox", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          if (isMounted) setDetections([]);
          return;
        }

        const payload = await response.json();
        const nextDetections = getRawDetections(payload)
          .map(normalizeDetection)
          .filter((detection): detection is BboxDetection => Boolean(detection));

        if (isMounted) setDetections(nextDetections);
      } catch {
        if (isMounted) setDetections([]);
      }
    }

    fetchDetections();
    const intervalId = window.setInterval(fetchDetections, 900);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      controller?.abort();
    };
  }, [cameraId]);

  const frameClass = "relative overflow-hidden bg-gradient-to-br " + getCctvSceneClass(index) + " " + (large ? "h-[420px]" : "h-64");

  return (
    <div className={frameClass}>
      {cctv.streamUrl ? (
        <img
          src={cctv.streamUrl}
          alt={cctv.cctvCode + " CCTV 영상"}
          className="h-full w-full object-cover"
          onError={() => setStreamFailed(true)}
          onLoad={() => setStreamFailed(false)}
        />
      ) : (
        <>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(110deg,transparent_0_28%,rgba(15,23,42,0.45)_28%_34%,transparent_34%_45%,rgba(15,23,42,0.42)_45%_51%,transparent_51%_100%)]" />
          <div className="absolute inset-x-12 bottom-0 h-2/3 bg-slate-800/35 [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)]" />
        </>
      )}
      {streamFailed ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/70 px-4 text-center text-white">
          <div>
            <strong className="block text-sm font-black">스트림 연결 실패</strong>
            <span className="mt-1 block text-xs font-semibold text-slate-300">streamUrl 또는 AI VM 프록시 상태를 확인해 주세요.</span>
          </div>
        </div>
      ) : null}
      <BboxOverlay detections={detections} />
      <div className="absolute left-3 top-3 flex gap-2">
        {cctv.isLive ? <span className="rounded bg-red-600 px-2 py-1 text-xs font-black text-white">LIVE</span> : null}
        <span className="rounded bg-slate-700/90 px-2 py-1 text-xs font-black text-white">{cctv.cctvCode}</span>
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-2 text-xs font-black text-white">
        <span>⌁</span>
        <span className={cctv.status === "OFFLINE" ? "text-red-200" : "text-white"}>
          {statusLabels[cctv.status]}
        </span>
      </div>
      {cctv.isAiDetected ? (
        <span className="absolute left-3 top-11 rounded bg-orange-500 px-2 py-1 text-xs font-black text-white">
          AI DETECTED
        </span>
      ) : null}
      <div className="absolute bottom-3 left-3 text-white">
        <b className="text-sm font-black drop-shadow">{cctv.roadName} {cctv.locationName}</b>
        {cctv.isAiDetected && cctv.detectionType ? (
          <p className="mt-1 text-xs font-bold text-yellow-300">
            {cctv.detectionType} 감지 {cctv.confidence ? "(신뢰도 " + Math.round(cctv.confidence * 100) + "%)" : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CctvCard({
  cctv,
  index,
  slotNumber,
  onSelect,
  onConfigureRoi,
}: {
  cctv: Cctv;
  index: number;
  slotNumber?: number;
  onSelect: (cctv: Cctv) => void;
  onConfigureRoi?: (slotNumber: 1 | 2) => void;
}) {
  const borderClass = cctv.isAiDetected ? "border-orange-500 hover:border-orange-600" : cardBorderClasses[cctv.status];

  return (
    <article className={"overflow-hidden rounded-lg border-2 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " + borderClass}>
      <button type="button" onClick={() => onSelect(cctv)} className="block w-full text-left">
        <CctvFrame cctv={cctv} index={index} />
      </button>
      <div className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {slotNumber ? <span className="rounded bg-slate-900 px-2 py-1 text-xs font-black text-white">{slotNumber}번 카메라</span> : null}
              <span className={"shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold " + statusClasses[cctv.status]}>
                {statusLabels[cctv.status]}
              </span>
            </div>
            <b className="block truncate text-lg text-slate-950">{cctv.roadName} {cctv.locationName}</b>
            <p className="mt-1 text-sm font-semibold text-slate-500">{cctv.cctvCode} · {cctv.roadName} · {cctv.location}</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">마지막 업데이트: {cctv.lastUpdatedAt}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onSelect(cctv)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
            상세 보기
          </button>
          {slotNumber && slotNumber <= 2 ? (
            <button type="button" onClick={() => onConfigureRoi?.(slotNumber as 1 | 2)} className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800">
              {slotNumber}번 카메라 ROI 설정
            </button>
          ) : (
            <button type="button" disabled className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-400">
              ROI 준비 중
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export { statusLabels };
