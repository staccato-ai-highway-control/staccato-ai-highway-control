/**
 * 파일 역할: 알림 영역에서 사용하는 RealtimePreviewToast UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { BellRing, ExternalLink, X } from "lucide-react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: @/features/realtime/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { RealtimeEventPreview } from "@/features/realtime/types";
// 코드 설명: @/lib/dateTime 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { formatKstDateTime } from "@/lib/dateTime";
// 코드 설명: @/lib/mediaUrl 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { normalizeMediaUrl } from "@/lib/mediaUrl";

// 코드 설명: RealtimePreviewToastProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RealtimePreviewToastProps = {
  event: RealtimeEventPreview | null;
  open: boolean;
  onClose: () => void;
};


// 코드 설명: getSeverityClass 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getSeverityClass(severity?: string) {
  // 코드 설명: severity?.toUpperCase() 값에 따라 처리할 상태 분기를 선택합니다.
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "border-red-300 bg-red-50 text-red-700 shadow-sm shadow-red-950/10"
      return "border-red-300 bg-red-50 text-red-700 shadow-sm shadow-red-950/10";
    case "HIGH":
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "border-orange-300 bg-orange-50 text-orange-700 shadow-sm shadow-orange…
      return "border-orange-300 bg-orange-50 text-orange-700 shadow-sm shadow-orange-950/10";
    case "MEDIUM":
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "border-amber-300 bg-amber-50 text-amber-700"
      return "border-amber-300 bg-amber-50 text-amber-700";
    case "LOW":
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "border-sky-300 bg-sky-50 text-sky-700"
      return "border-sky-300 bg-sky-50 text-sky-700";
    case "INFO":
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "border-emerald-300 bg-emerald-50 text-emerald-700"
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
    default:
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "border-slate-300 bg-slate-100 text-slate-700"
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

// 코드 설명: getPreviewKind 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getPreviewKind(event: RealtimeEventPreview) {
  // 코드 설명: previewType 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const previewType = event.preview_type?.toLowerCase();
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: event.video_url || previewType === "video" || (event.preview_url && pre…
  if (event.video_url || previewType === "video" || (event.preview_url && previewType !== "image")) return "video";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: event.snapshot_url || event.preview_url
  if (event.snapshot_url || event.preview_url) return "image";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
  return null;
}

// 코드 설명: getPreviewUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getPreviewUrl(event: RealtimeEventPreview) {
  // 코드 설명: previewKind 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const previewKind = getPreviewKind(event);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: previewKind === "video"
  if (previewKind === "video") return normalizeMediaUrl(event.preview_url ?? event.video_url ?? null);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: previewKind === "image"
  if (previewKind === "image") return normalizeMediaUrl(event.preview_url ?? event.snapshot_url ?? null);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
  return null;
}

// 코드 설명: isExternalUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isExternalUrl(url: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: /^https?:\/\//i.test(url)
  return /^https?:\/\//i.test(url);
}

// 코드 설명: PreviewMedia 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function PreviewMedia({ event }: { event: RealtimeEventPreview }) {
  // 코드 설명: kind 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const kind = getPreviewKind(event);
  // 코드 설명: url 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const url = getPreviewUrl(event);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: kind === "video" && url
  if (kind === "video" && url) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: kind === "image" && url
  if (kind === "image" && url) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <img
        src={url}
        alt="실시간 이벤트 미리보기"
        className="mt-3 aspect-video w-full rounded-lg bg-slate-100 object-cover"
      />
    );
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
  return null;
}

// 코드 설명: RealtimePreviewToast 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function RealtimePreviewToast({ event, open, onClose }: RealtimePreviewToastProps) {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !open || !event
  if (!open || !event) return null;

  // 코드 설명: severity 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const severity = event.severity ?? "INFO";
  // 코드 설명: occurredAt 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const occurredAt = event.occurred_at ?? event.created_at;

  // 코드 설명: openTarget 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function openTarget(targetUrl: string) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isExternalUrl(targetUrl)
    if (isExternalUrl(targetUrl)) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.location.href = targetUrl;
      window.location.href = targetUrl;
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
    router.push(targetUrl);
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
