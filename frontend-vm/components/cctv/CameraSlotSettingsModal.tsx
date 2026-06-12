/**
 * 파일 역할: CCTV 영역에서 사용하는 CameraSlotSettingsModal UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Save, X } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useMemo, useState } from "react";
// 코드 설명: @/types/cctv 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Cctv } from "@/types/cctv";
// 코드 설명: @/features/cctvs/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { CameraSlotConfig } from "@/features/cctvs/api";

// 코드 설명: CameraSlotSettingsModalProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type CameraSlotSettingsModalProps = {
  cctvs: Cctv[];
  config: CameraSlotConfig[];
  onClose: () => void;
  onSave: (config: CameraSlotConfig[]) => void | Promise<void>;
};

// 코드 설명: getCctvLabel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getCctvLabel(cctv: Cctv) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${cctv.cctvCode} · ${cctv.roadName} ${cctv.locationName}`
  return `${cctv.cctvCode} · ${cctv.roadName} ${cctv.locationName}`;
}

// 코드 설명: getCctvValue 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getCctvValue(cctv: Cctv) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: cctv.cctvCode || cctv.id
  return cctv.cctvCode || cctv.id;
}

// 코드 설명: getSlotValue 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getSlotValue(slot: CameraSlotConfig) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: slot.cctvId || ""
  return slot.cctvId || "";
}

// 코드 설명: CameraSlotSettingsModal 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function CameraSlotSettingsModal({ cctvs, config, onClose, onSave }: CameraSlotSettingsModalProps) {
  // 코드 설명: [draftConfig, setDraftConfig] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [draftConfig, setDraftConfig] = useState(config);
  // 코드 설명: [isSaving, setIsSaving] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isSaving, setIsSaving] = useState(false);

  // 코드 설명: cctvById 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const cctvById = useMemo(() => {
    // 코드 설명: map 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const map = new Map<string, Cctv>();
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: cctvs.forEach((cctv) => { map.set(cctv.id, cctv); map.set(cctv.cctvCode…
    cctvs.forEach((cctv) => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: map.set(cctv.id, cctv);
      map.set(cctv.id, cctv);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: map.set(cctv.cctvCode, cctv);
      map.set(cctv.cctvCode, cctv);
    });
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: map
    return map;
  }, [cctvs]);

  // 코드 설명: handleChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleChange(slotNumber: number, cctvId: string) {
    // 코드 설명: cctv 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const cctv = cctvById.get(cctvId);

    // 코드 설명: setDraftConfig 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDraftConfig((current) =>
      current.map((item) =>
        item.slotNumber === slotNumber
          ? {
              slotNumber,
              cctvId,
              cctvName: cctv?.cctvCode ?? (cctvId ? cctvId : `Slot ${slotNumber}`),
              streamUrl: cctv?.streamUrl,
            }
          : item
      )
    );
  }

  // 코드 설명: handleSave 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleSave() {
    // 코드 설명: setIsSaving 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsSaving(true);
    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await onSave(draftConfig);
      await onSave(draftConfig);
    } finally {
      // 코드 설명: setIsSaving 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSaving(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
                value={getSlotValue(slot)}
                onChange={(event) => handleChange(slot.slotNumber, event.target.value)}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                <option value="">카메라 미배정</option>
                {cctvs.map((cctv) => (
                  <option key={cctv.id} value={getCctvValue(cctv)}>{getCctvLabel(cctv)}</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">취소</button>
          <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSaving ? "저장 중" : "저장"}
          </button>
        </footer>
      </section>
    </div>
  );
}
