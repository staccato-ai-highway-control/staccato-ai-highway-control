import type { ReactNode } from "react";
import type { Cctv } from "@/types/cctv";

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
  return (
    <div className={`relative overflow-hidden bg-slate-900 ${large ? "aspect-video" : "h-64"}`}>
      {showStream && cctv.streamUrl ? (
        <img
          src={cctv.streamUrl}
          alt={`${cctv.cctvCode ?? cctv.id} stream`}
          className="absolute inset-0 h-full w-full object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            onStreamError?.();
          }}
          onLoad={onStreamLoad}
        />
      ) : null}
      {children}
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

export { statusLabels };
