"use client";

import { Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Cctv } from "@/types/cctv";
import type { CameraSlotConfig } from "@/features/cctvs/api";

type CameraSlotSettingsModalProps = {
  cctvs: Cctv[];
  config: CameraSlotConfig[];
  onClose: () => void;
  onSave: (config: CameraSlotConfig[]) => void;
};

function getCctvLabel(cctv: Cctv) {
  return `${cctv.cctvCode} · ${cctv.roadName} ${cctv.locationName}`;
}

export function CameraSlotSettingsModal({ cctvs, config, onClose, onSave }: CameraSlotSettingsModalProps) {
  const [draftConfig, setDraftConfig] = useState(config);

  const cctvById = useMemo(() => new Map(cctvs.map((cctv) => [cctv.id, cctv])), [cctvs]);

  function handleChange(slotNumber: number, cctvId: string) {
    const cctv = cctvById.get(cctvId);

    setDraftConfig((current) =>
      current.map((item) =>
        item.slotNumber === slotNumber
          ? {
              slotNumber,
              cctvId,
              cctvName: cctv?.cctvCode ?? cctvId,
              streamUrl: cctv?.streamUrl,
            }
          : item
      )
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">CCTV 카메라 배치 설정</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">1번부터 8번 카메라 슬롯에 표시할 CCTV를 선택합니다.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="닫기">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-3 p-5">
          {draftConfig.map((slot) => (
            <label key={slot.slotNumber} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 md:grid-cols-[130px_1fr] md:items-center">
              <span>{slot.slotNumber}번 카메라</span>
              <select
                value={slot.cctvId}
                onChange={(event) => handleChange(slot.slotNumber, event.target.value)}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                {cctvs.map((cctv) => (
                  <option key={cctv.id} value={cctv.id}>{getCctvLabel(cctv)}</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">취소</button>
          <button type="button" onClick={() => onSave(draftConfig)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800">
            <Save className="h-4 w-4" aria-hidden="true" />
            저장
          </button>
        </footer>
      </section>
    </div>
  );
}
