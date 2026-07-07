/**
 * 파일 역할: CCTV 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RefreshCw } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useState } from "react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/cctv/BboxDetectionOverlay 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { BboxDetectionOverlay } from "@/components/cctv/BboxDetectionOverlay";
// 코드 설명: @/components/cctv/CctvCard 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { CctvFrame, statusLabels } from "@/components/cctv/CctvCard";
// 코드 설명: @/components/cctv/CctvDetailModal 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { CctvDetailModal } from "@/components/cctv/CctvDetailModal";
// 코드 설명: @/components/cctv/RoiSettingsModal 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RoiSettingsModal } from "@/components/cctv/RoiSettingsModal";
// 코드 설명: @/features/cctvs/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getCameras, type CameraSlotConfig } from "@/features/cctvs/api";
// 코드 설명: @/types/cctv 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Cctv } from "@/types/cctv";

// CCTV-003~007 장애 완화를 위한 임시 UI 격리 정책입니다. 안정화 후 제거 대상입니다.
const TEMP_ALLOWED_CCTV_CODES = new Set([
  "CCTV-001",
  "CCTV-002",
]);

function getCctvIsolationKey(cctv: Cctv) {
  return cctv.cctvCode || cctv.id;
}

function isTemporarilyAllowedCctv(cctv: Cctv) {
  return TEMP_ALLOWED_CCTV_CODES.has(getCctvIsolationKey(cctv));
}

// 코드 설명: getCameraLabel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getCameraLabel(cctv: Cctv, index: number) {
  // 코드 설명: raw 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const raw = cctv as Cctv & Record<string, unknown>;
  // 코드 설명: primary 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const primary =
    cctv.name ||
    String(raw.location_name ?? "") ||
    cctv.locationName ||
    String(raw.road_name ?? "") ||
    cctv.roadName ||
    cctv.id;
  // 코드 설명: roadName 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const roadName = cctv.roadName && cctv.roadName !== "-" ? cctv.roadName : String(raw.road_name ?? "");
  // 코드 설명: direction 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const direction = cctv.direction && cctv.direction !== "-" ? cctv.direction : "";
  // 코드 설명: detail 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const detail = [roadName, direction].filter(Boolean).join(" ");
  // 코드 설명: label 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const label = detail && !String(primary).includes(detail) ? `${primary} - ${detail}` : primary;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `카메라 ${index + 1} - ${label}`
  return `카메라 ${index + 1} - ${label}`;
}

// 코드 설명: getStatusBadgeClass 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getStatusBadgeClass(status: Cctv["status"]) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: status === "OFFLINE"
  if (status === "OFFLINE") return "border-red-300 text-red-600";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: status === "MAINTENANCE"
  if (status === "MAINTENANCE") return "border-yellow-300 text-yellow-600";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "border-emerald-300 text-emerald-600"
  return "border-emerald-300 text-emerald-600";
}

// 코드 설명: createSingleSlotConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function createSingleSlotConfig(cctv: Cctv | null): CameraSlotConfig[] {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !cctv
  if (!cctv) return [];

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: [ { slotNumber: 1, cctvId: cctv.id, cctvName: cctv.cctvCode || cctv.nam…
  return [
    {
      slotNumber: 1,
      cctvId: cctv.id,
      cctvName: cctv.cctvCode || cctv.name || cctv.id,
      streamUrl: cctv.streamUrl,
    },
  ];
}

// 코드 설명: CctvsPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function CctvsPage() {
  // 코드 설명: [selectedCctvId, setSelectedCctvId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [selectedCctvId, setSelectedCctvId] = useState<string>("");
  // 코드 설명: [selectedDetailCctv, setSelectedDetailCctv] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [selectedDetailCctv, setSelectedDetailCctv] = useState<Cctv | null>(null);
  // 코드 설명: [cctvs, setCctvs] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [cctvs, setCctvs] = useState<Cctv[]>([]);
  // 코드 설명: [isLoading, setIsLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isLoading, setIsLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 코드 설명: [isRoiSettingsOpen, setIsRoiSettingsOpen] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isRoiSettingsOpen, setIsRoiSettingsOpen] = useState(false);
  // 코드 설명: [isStreamReady, setIsStreamReady] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isStreamReady, setIsStreamReady] = useState(false);

  // 코드 설명: loadCctvData 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadCctvData() {
    // 코드 설명: setIsLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: nextCctvs 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextCctvs = await getCameras({ limit: 8 });
      const allowedCctvs = nextCctvs.filter(isTemporarilyAllowedCctv);
      const isSelectedCctvAllowed = allowedCctvs.some((cctv) => cctv.id === selectedCctvId);
      const nextSelectedCctvId =
        allowedCctvs.length === 0 ? "" : isSelectedCctvAllowed ? selectedCctvId : allowedCctvs[0].id;
      if (selectedCctvId && !isSelectedCctvAllowed) {
        setIsRoiSettingsOpen(false);
      }
      // 코드 설명: setCctvs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setCctvs(allowedCctvs);
      setSelectedDetailCctv((currentCctv) => {
        if (!currentCctv || isTemporarilyAllowedCctv(currentCctv)) return currentCctv;
        return null;
      });
      // 코드 설명: setSelectedCctvId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSelectedCctvId(nextSelectedCctvId);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "CCTV 정보를 불러오지 못했습니다.");
      // 코드 설명: setCctvs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setCctvs([]);
      // 코드 설명: setSelectedCctvId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSelectedCctvId("");
    } finally {
      // 코드 설명: setIsLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsLoading(false);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadCctvData();
    loadCctvData();
  }, []);

  // 코드 설명: selectedCctv 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const selectedCctv = useMemo(() => {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: cctvs.find((cctv) => cctv.id === selectedCctvId) ?? cctvs[0] ?? null
    return cctvs.find((cctv) => cctv.id === selectedCctvId) ?? cctvs[0] ?? null;
  }, [cctvs, selectedCctvId]);

  // 코드 설명: selectedCctvIndex 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const selectedCctvIndex = selectedCctv ? cctvs.findIndex((cctv) => cctv.id === selectedCctv.id) : -1;
  // 코드 설명: roiSlotConfig 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const roiSlotConfig = useMemo(() => createSingleSlotConfig(selectedCctv), [selectedCctv]);
  // 코드 설명: isMainStreamVisible 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isMainStreamVisible = Boolean(selectedCctv && !isRoiSettingsOpen);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setIsStreamReady 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsStreamReady(false);
  }, [selectedCctv?.streamUrl, isMainStreamVisible]);


  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <AppLayout title="CCTV 관제">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">CCTV 관제</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              카메라를 선택하면 선택한 CCTV 1개만 실시간 송출합니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="cctv-camera-select">카메라 선택</label>
            <select
              id="cctv-camera-select"
              value={selectedCctv?.id ?? ""}
              onChange={(event) => setSelectedCctvId(event.target.value)}
              disabled={isLoading || cctvs.length === 0}
              className="h-11 min-w-72 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {cctvs.length === 0 ? <option value="">카메라 없음</option> : null}
              {cctvs.map((cctv, index) => (
                <option key={cctv.id} value={cctv.id}>
                  {getCameraLabel(cctv, index)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadCctvData}
              disabled={isLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              새로고침
            </button>
          </div>
        </section>

        {errorMessage ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}
        {isLoading ? (
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
            CCTV 정보를 불러오는 중입니다.
          </div>
        ) : null}

        {!isLoading && cctvs.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-500">
            사용 가능한 CCTV가 없습니다.
          </p>
        ) : null}

        {selectedCctv ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-1 text-xs font-black text-white">
                      {selectedCctv.cctvCode}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${getStatusBadgeClass(selectedCctv.status)}`}>
                      {statusLabels[selectedCctv.status]}
                    </span>
                  </div>
                  <h3 className="truncate text-xl font-black text-slate-950">
                    {selectedCctv.roadName} {selectedCctv.locationName}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {selectedCctv.name} · {selectedCctv.direction} · 마지막 업데이트: {selectedCctv.lastUpdatedAt}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailCctv(selectedCctv)}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    상세 보기
                  </button>
                  {selectedCctv.imageUrl ? (
                    <a
                      href={selectedCctv.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      스냅샷 보기
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsRoiSettingsOpen(true)}
                    className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    ROI 임시 설정
                  </button>
                </div>
              </div>
              <CctvFrame
                cctv={selectedCctv}
                index={selectedCctvIndex >= 0 ? selectedCctvIndex : 0}
                large
                showStream={isMainStreamVisible}
                onStreamError={() => setIsStreamReady(false)}
                onStreamLoad={() => setIsStreamReady(true)}
              >
                <BboxDetectionOverlay cctv={selectedCctv} enabled={isMainStreamVisible && isStreamReady} />
              </CctvFrame>
            </section>

            <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-black text-slate-950">CCTV metadata 목록</h3>
                <span className="text-xs font-bold text-slate-400">{cctvs.length}개</span>
              </div>
              <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">
                {cctvs.map((cctv, index) => {
                  // 코드 설명: isSelected 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const isSelected = cctv.id === selectedCctv.id;

                  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
                  return (
                    <button
                      key={cctv.id}
                      type="button"
                      onClick={() => setSelectedCctvId(cctv.id)}
                      className={`rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? "border-teal-500 bg-teal-50 text-teal-950"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <b className="block truncate text-sm">{getCameraLabel(cctv, index)}</b>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                        {cctv.cctvCode} · {statusLabels[cctv.status]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        ) : null}

        {selectedDetailCctv ? (
          <CctvDetailModal
            cctv={selectedDetailCctv}
            cctvIndex={selectedCctvIndex >= 0 ? selectedCctvIndex : 0}
            onClose={() => setSelectedDetailCctv(null)}
          />
        ) : null}

        {isRoiSettingsOpen && selectedCctv ? (
          <RoiSettingsModal
            initialSlotNumber={1}
            slotConfig={roiSlotConfig}
            cctvs={cctvs}
            onClose={() => setIsRoiSettingsOpen(false)}
          />
        ) : null}
      </AppLayout>
    </RequireAuth>
  );
}
