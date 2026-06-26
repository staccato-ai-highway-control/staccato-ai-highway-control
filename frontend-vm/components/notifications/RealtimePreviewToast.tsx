"use client";

import { BellRing, ExternalLink, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RealtimeEventPreview } from "@/features/realtime/types";
import { formatKstDateTime } from "@/lib/dateTime";
import { normalizeMediaUrl } from "@/lib/mediaUrl";

type RealtimePreviewToastProps = {
  event: RealtimeEventPreview | null;
  open: boolean;
  onClose: () => void;
};


function getSeverityClass(severity?: string) {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return "border-red-300 bg-red-50 text-red-700 shadow-sm shadow-red-950/10";
    case "HIGH":
      return "border-orange-300 bg-orange-50 text-orange-700 shadow-sm shadow-orange-950/10";
    case "MEDIUM":
      return "border-amber-300 bg-amber-50 text-amber-700";
    case "LOW":
      return "border-sky-300 bg-sky-50 text-sky-700";
    case "INFO":
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

function getPreviewKind(event: RealtimeEventPreview) {
  const previewType = event.preview_type?.toLowerCase();
  if (event.video_url || previewType === "video" || (event.preview_url && previewType !== "image")) return "video";
  if (event.snapshot_url || event.preview_url) return "image";
  return null;
}

function getPreviewUrl(event: RealtimeEventPreview) {
  const previewKind = getPreviewKind(event);
  if (previewKind === "video") return normalizeMediaUrl(event.preview_url ?? event.video_url ?? null);
  if (previewKind === "image") return normalizeMediaUrl(event.preview_url ?? event.snapshot_url ?? null);
  return null;
}

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function PreviewMedia({ event }: { event: RealtimeEventPreview }) {
  const kind = getPreviewKind(event);
  const url = getPreviewUrl(event);

  if (kind === "video" && url) {
    return (
      <video
        src={url}
        muted
        autoPlay
        loop
        playsInline
        controls
        className="mt-3 aspect-video w-full rounded-lg bg-slate-950 object-cover"
      />
    );
  }

  if (kind === "image" && url) {
    return (
      <img
        src={url}
        alt="실시간 이벤트 미리보기"
        className="mt-3 aspect-video w-full rounded-lg bg-slate-100 object-cover"
      />
    );
  }

  return null;
}

export function RealtimePreviewToast({ event, open, onClose }: RealtimePreviewToastProps) {
  const router = useRouter();

  if (!open || !event) return null;

  const severity = event.severity ?? "INFO";
  const occurredAt = event.occurred_at ?? event.created_at;

  function openTarget(targetUrl: string) {
    if (isExternalUrl(targetUrl)) {
      window.location.href = targetUrl;
      return;
    }

    router.push(targetUrl);
  }

  return (
    <div className="fixed right-4 top-20 z-[80] w-[min(420px,calc(100vw-2rem))]">
      <article className="overflow-hidden rounded-lg border border-slate-700/70 bg-slate-950 text-white shadow-2xl shadow-slate-950/20">
        <div className="flex items-start gap-3 p-4">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-amber-200">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={"rounded-full border px-2 py-0.5 text-[11px] font-black " + getSeverityClass(severity)}>
                {severity}
              </span>
              <span className="truncate text-xs font-bold text-slate-300">
                {event.event_type || "REALTIME"}
              </span>
              {event.source_cctv_id ? (
                <span className="truncate text-xs font-bold text-slate-400">CCTV {event.source_cctv_id}</span>
              ) : null}
            </div>
            <h2 className="mt-2 text-base font-black leading-5 text-white">이상상황 감지</h2>
            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-100">
              {event.message || "새 실시간 이벤트가 발생했습니다."}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{formatKstDateTime(occurredAt)}</p>
            <PreviewMedia event={event} />
            {event.target_url ? (
              <button
                type="button"
                onClick={() => openTarget(event.target_url as string)}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-black text-slate-950 transition hover:bg-slate-100"
              >
                상세 보기
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="미리보기 알림 닫기"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </article>
    </div>
  );
}
