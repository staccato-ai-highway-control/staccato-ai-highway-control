/**
 * 파일 역할: CCTV 영역에서 사용하는 CctvDetailModal UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { X } from "lucide-react";
// 코드 설명: @/types/cctv 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Cctv } from "@/types/cctv";
// 코드 설명: @/components/cctv/CctvCard 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { CctvFrame, statusLabels } from "@/components/cctv/CctvCard";

// 코드 설명: formatConfidence 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatConfidence(confidence?: number) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof confidence !== "number"
  if (typeof confidence !== "number") return "-";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${Math.round(confidence * 100)}%`
  return `${Math.round(confidence * 100)}%`;
}

// 코드 설명: CctvDetailModal 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function CctvDetailModal({
  cctv,
  cctvIndex,
  onClose,
}: {
  cctv: Cctv;
  cctvIndex: number;
  onClose: () => void;
}) {
  // 코드 설명: detailRows 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
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

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
