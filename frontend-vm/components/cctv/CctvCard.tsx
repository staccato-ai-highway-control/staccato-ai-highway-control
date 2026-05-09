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
  onSelect,
}: {
  cctv: Cctv;
  index: number;
  onSelect: (cctv: Cctv) => void;
}) {
  const borderClass = cctv.isAiDetected ? "border-orange-500 hover:border-orange-600" : cardBorderClasses[cctv.status];

  return (
    <button
      type="button"
      onClick={() => onSelect(cctv)}
      className={`overflow-hidden rounded-lg border-2 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderClass}`}
    >
      <CctvFrame cctv={cctv} index={index} />
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <b className="block truncate text-lg text-slate-950">{cctv.roadName} {cctv.locationName}</b>
          <p className="mt-1 text-sm font-semibold text-slate-500">{cctv.roadName} · {cctv.location}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">마지막 업데이트: {cctv.lastUpdatedAt}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-sm font-bold ${statusClasses[cctv.status]}`}>
          {statusLabels[cctv.status]}
        </span>
      </div>
    </button>
  );
}

export { statusLabels };
