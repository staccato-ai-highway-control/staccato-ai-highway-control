"use client";

import { X } from "lucide-react";
import type { Cctv } from "@/types/cctv";
import { CctvFrame, statusLabels } from "@/components/cctv/CctvCard";

function formatConfidence(confidence?: number) {
  if (typeof confidence !== "number") return "-";
  return `${Math.round(confidence * 100)}%`;
}

export function CctvDetailModal({
  cctv,
  cctvIndex,
  onClose,
}: {
  cctv: Cctv;
  cctvIndex: number;
  onClose: () => void;
}) {
  const detailRows = [
    ["CCTV 코드", cctv.cctvCode],
    ["도로명", cctv.roadName],
    ["위치명", cctv.locationName],
    ["방향", cctv.direction],
    ["연결 상태", statusLabels[cctv.status]],
    ["최근 업데이트", cctv.lastUpdatedAt],
    ["최근 탐지 여부", cctv.isAiDetected ? "탐지됨" : "없음"],
    ["감지 유형", cctv.detectionType ?? "-"],
    ["신뢰도", formatConfidence(cctv.confidence)],
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">{cctv.roadName} {cctv.locationName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{cctv.cctvCode} · {cctv.direction}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-5 p-5 xl:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <CctvFrame cctv={cctv} index={cctvIndex} large showStream={false} />
          </div>

          <aside className="grid content-start gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-black text-slate-950">CCTV 상세 정보</h3>
              <dl className="mt-4 grid gap-3">
                {detailRows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 text-sm">
                    <dt className="font-semibold text-slate-500">{label}</dt>
                    <dd className="text-right font-bold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <button type="button" disabled className="h-11 cursor-not-allowed rounded-lg bg-slate-300 px-4 font-bold text-white">수동 이벤트 API 미연결</button>
            <p className="text-xs font-semibold leading-5 text-amber-700">실제 이벤트 생성 API가 연결되기 전에는 수동 이벤트를 생성하지 않습니다.</p>
          </aside>
        </div>

        <div className="border-t border-slate-200 p-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-800">
            <b className="block text-amber-950">수동 이벤트 생성 API가 아직 연결되지 않았습니다.</b>
            로컬 시연 이벤트나 임의 이력은 표시하지 않습니다. <code>POST /api/cctvs/{"{camera_id}"}/manual-events</code> 연결 후 활성화됩니다.
          </div>
        </div>
      </section>
    </div>
  );
}
