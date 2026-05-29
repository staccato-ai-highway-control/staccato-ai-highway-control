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

export function CctvFrame({
  cctv,
  index = 0,
  large = false,
}: {
  cctv: Cctv;
  index?: number;
  large?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${getCctvSceneClass(index)} ${large ? "h-[420px]" : "h-64"}`}>
      {/* STACCATO_STREAM_IN_MEDIA_PATCH */}
        {cctv.streamUrl ? (
          <img
            src={cctv.streamUrl}
            alt={`${cctv.cctvCode ?? cctv.id} stream`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
<div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(110deg,transparent_0_28%,rgba(15,23,42,0.45)_28%_34%,transparent_34%_45%,rgba(15,23,42,0.42)_45%_51%,transparent_51%_100%)]" />
      <div className="absolute inset-x-12 bottom-0 h-2/3 bg-slate-800/35 [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)]" />
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
            {cctv.detectionType} 감지 {cctv.confidence ? `(신뢰도 ${Math.round(cctv.confidence * 100)}%)` : ""}
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
    <article className={`overflow-hidden rounded-lg border-2 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderClass}`}>
<button type="button" onClick={() => onSelect(cctv)} className="block w-full text-left">
        <CctvFrame cctv={cctv} index={index} />
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
