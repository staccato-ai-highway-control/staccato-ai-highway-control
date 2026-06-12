/**
 * 파일 역할: CCTV 영역에서 사용하는 CctvCard UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
// 코드 설명: @/types/cctv 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Cctv } from "@/types/cctv";

// 코드 설명: statusLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusLabels = {
  ONLINE: "정상",
  OFFLINE: "연결 끊김",
  MAINTENANCE: "점검중",
} as const;

// 코드 설명: statusClasses 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusClasses = {
  ONLINE: "border-emerald-300 text-emerald-600",
  OFFLINE: "border-red-300 text-red-600",
  MAINTENANCE: "border-yellow-300 text-yellow-600",
} as const;

// 코드 설명: cardBorderClasses 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const cardBorderClasses = {
  ONLINE: "border-emerald-300 hover:border-emerald-400",
  OFFLINE: "border-red-300 hover:border-red-400",
  MAINTENANCE: "border-yellow-300 hover:border-yellow-400",
} as const;

// 코드 설명: STREAM_RETRY_DELAY_MS 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const STREAM_RETRY_DELAY_MS = 1500;

// 코드 설명: appendRetryParam 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function appendRetryParam(streamUrl: string, retryToken: number) {
  // 코드 설명: separator 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const separator = streamUrl.includes("?") ? "&" : "?";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${streamUrl}${separator}retry=${retryToken}`
  return `${streamUrl}${separator}retry=${retryToken}`;
}


// 코드 설명: CctvFrame 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function CctvFrame({
  cctv,
  large = false,
  showStream = false,
  children,
  onStreamError,
  onStreamLoad,
}: {
  cctv: Cctv;
  index?: number;
  large?: boolean;
  showStream?: boolean;
  children?: ReactNode;
  onStreamError?: () => void;
  onStreamLoad?: () => void;
}) {
  // 코드 설명: [retryToken, setRetryToken] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [retryToken, setRetryToken] = useState(0);
  // 코드 설명: retryTimerRef 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const retryTimerRef = useRef<number | null>(null);
  // 코드 설명: streamUrl 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const streamUrl = useMemo(
    () => (cctv.streamUrl ? appendRetryParam(cctv.streamUrl, retryToken) : undefined),
    [cctv.streamUrl, retryToken]
  );

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setRetryToken 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setRetryToken(0);

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { if (retryTimerRef.current) window.clearTimeout(retryTimerRef.cu…
    return () => {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: retryTimerRef.current
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, [cctv.streamUrl, showStream]);

  // 코드 설명: handleStreamError 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleStreamError() {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: onStreamError?.();
    onStreamError?.();
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: retryTimerRef.current
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: retryTimerRef.current = window.setTimeout(() => { setRetryToken(Date.no…
    retryTimerRef.current = window.setTimeout(() => {
      // 코드 설명: setRetryToken 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setRetryToken(Date.now());
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: retryTimerRef.current = null;
      retryTimerRef.current = null;
    }, STREAM_RETRY_DELAY_MS);
  }

  // 코드 설명: handleStreamLoad 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleStreamLoad() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: retryTimerRef.current
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: retryTimerRef.current = null;
    retryTimerRef.current = null;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: onStreamLoad?.();
    onStreamLoad?.();
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className={`relative overflow-hidden bg-slate-900 ${large ? "aspect-video" : "h-64"}`}>
      {showStream && streamUrl ? (
        <img
          key={streamUrl}
          src={streamUrl}
          alt={`${cctv.cctvCode ?? cctv.id} stream`}
          className="absolute inset-0 h-full w-full object-fill"
          onError={handleStreamError}
          onLoad={handleStreamLoad}
        />
      ) : null}
      {children}
    </div>
  );
}

// 코드 설명: CctvCard 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
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
  // 코드 설명: borderClass 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const borderClass = cctv.isAiDetected ? "border-orange-500 hover:border-orange-600" : cardBorderClasses[cctv.status];

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <article className={`overflow-hidden rounded-lg border-2 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderClass}`}>
<button type="button" onClick={() => onSelect(cctv)} className="block w-full text-left">
        <CctvFrame cctv={cctv} index={index} showStream={false} />
      </button>
      <div className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {slotNumber ? <span className="rounded bg-slate-900 px-2 py-1 text-xs font-black text-white">{slotNumber}번 카메라</span> : null}
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${statusClasses[cctv.status]}`}>
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

// 코드 설명: 다른 모듈이 이 기능을 재사용할 수 있도록 공개 API로 다시 내보냅니다.
export { statusLabels };
