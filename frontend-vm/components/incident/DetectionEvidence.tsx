"use client";

import { useMemo, useState } from "react";
import type { Incident } from "@/features/incidents/types";
import { API_BASE_URL } from "@/lib/constants";

type IncidentWithSnapshotFields = Incident & {
  snapshot_url?: string | null;
  snapshotPath?: string | null;
  snapshot_path?: string | null;
  previewUrl?: string | null;
  preview_url?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  evidenceUrl?: string | null;
  evidence_url?: string | null;
};

function pickSnapshotUrl(incident: IncidentWithSnapshotFields) {
  return (
    incident.snapshotUrl ??
    incident.snapshot_url ??
    incident.snapshotPath ??
    incident.snapshot_path ??
    incident.previewUrl ??
    incident.preview_url ??
    incident.imageUrl ??
    incident.image_url ??
    incident.evidenceUrl ??
    incident.evidence_url ??
    null
  );
}

function normalizeSnapshotUrl(rawUrl?: string | null) {
  if (!rawUrl || rawUrl === "null" || rawUrl === "undefined") return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//.test(trimmed)) return trimmed;

  const normalizedPath = trimmed.startsWith("/") ? trimmed : "/" + trimmed;

  if (
    normalizedPath.startsWith("/api/") ||
    normalizedPath.startsWith("/event_media/") ||
    normalizedPath.startsWith("/uploads/") ||
    normalizedPath.startsWith("/static/") ||
    normalizedPath.startsWith("/media/")
  ) {
    return `${API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
  }

  return normalizedPath;
}

export function DetectionEvidence({ incident }: { incident: Incident }) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const rawSnapshotUrl = useMemo(() => pickSnapshotUrl(incident as IncidentWithSnapshotFields), [incident]);
  const snapshotUrl = useMemo(() => normalizeSnapshotUrl(rawSnapshotUrl), [rawSnapshotUrl]);
  const canShowImage = Boolean(snapshotUrl) && !imageLoadFailed;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative min-h-80 bg-slate-100">
        {canShowImage ? (
          <img
            src={snapshotUrl ?? undefined}
            alt="AI 탐지 증거"
            className="h-80 w-full object-cover"
            onError={() => setImageLoadFailed(true)}
          />
        ) : (
          <div className="flex h-80 w-full flex-col items-center justify-center gap-2 text-slate-500">
            <p className="text-sm font-black">AI 탐지 증거 이미지가 없습니다.</p>
            <p className="text-xs font-semibold">
              이벤트 데이터에 스냅샷 URL이 없거나 이미지 파일을 불러오지 못했습니다.
            </p>
          </div>
        )}


      </div>
    </section>
  );
}
