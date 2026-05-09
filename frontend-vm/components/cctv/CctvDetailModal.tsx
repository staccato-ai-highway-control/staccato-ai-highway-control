"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { Cctv } from "@/types/cctv";
import type { ManualIncident, ManualIncidentPayload } from "@/types/incident";
import { CctvFrame, statusLabels } from "@/components/cctv/CctvCard";
import { ManualIncidentForm } from "@/components/cctv/ManualIncidentForm";

function formatConfidence(confidence?: number) {
  if (typeof confidence !== "number") return "-";
  return `${Math.round(confidence * 100)}%`;
}

export function CctvDetailModal({
  cctv,
  cctvIndex,
  incidents,
  onClose,
  onCreateIncident,
}: {
  cctv: Cctv;
  cctvIndex: number;
  incidents: ManualIncident[];
  onClose: () => void;
  onCreateIncident: (payload: ManualIncidentPayload) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);

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
            <CctvFrame cctv={cctv} index={cctvIndex} large />
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
            <button
              type="button"
              onClick={() => setIsFormOpen((value) => !value)}
              className="h-11 rounded-lg bg-orange-500 px-4 font-bold text-white transition hover:bg-orange-600"
            >
              {isFormOpen ? "등록 폼 닫기" : "수동 사고 등록"}
            </button>
          </aside>
        </div>

        <div className="grid gap-5 border-t border-slate-200 p-5 xl:grid-cols-[1fr_360px]">
          <div>
            {isFormOpen ? (
              <ManualIncidentForm cctv={cctv} onSubmit={onCreateIncident} />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                관리자 확인이 필요한 상황이면 수동 사고 등록 버튼을 눌러 사고를 생성하세요.
              </div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">최근 수동 등록 이력</h3>
            <div className="mt-4 grid gap-3">
              {incidents.length > 0 ? (
                incidents.map((incident) => (
                  <div key={incident.id} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <b className="text-sm text-slate-950">{incident.incidentCode}</b>
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{incident.riskLevel}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{incident.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{incident.createdAt}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-500">등록 이력이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
