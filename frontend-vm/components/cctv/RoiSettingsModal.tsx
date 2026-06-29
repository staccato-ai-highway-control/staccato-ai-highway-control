/**
 * 파일 역할: CCTV 영역에서 사용하는 RoiSettingsModal UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Eye, Save, Trash2, X } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { MouseEvent, useEffect, useMemo, useState } from "react";
// 코드 설명: @/types/cctv 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Cctv } from "@/types/cctv";
// 코드 설명: @/features/cctvs/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import {
  createDefaultCameraRoiConfig,
  getCctvRois,
  ORIGINAL_HEIGHT,
  ORIGINAL_WIDTH,
  saveCctvRois,
  type CameraRoiConfig,
  type CameraSlotConfig,
  type RoiPolygon,
  type RoiType,
} from "@/features/cctvs/api";

// 코드 설명: roiTypeLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const roiTypeLabels: Record<RoiType, string> = {
  DRIVING_LANE: "DRIVING_LANE · 주행 차로 분석 대상",
  SHOULDER: "SHOULDER · 갓길 정차 분석 대상",
  IGNORE_ZONE: "IGNORE_ZONE · 고속도로 밖 차량 제거 영역",
};

// 코드 설명: roiColors 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const roiColors: Record<RoiType, string> = {
  DRIVING_LANE: "#22c55e",
  SHOULDER: "#f59e0b",
  IGNORE_ZONE: "#ef4444",
};

// 코드 설명: RoiSettingsModalProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RoiSettingsModalProps = {
  initialSlotNumber: 1 | 2;
  slotConfig: CameraSlotConfig[];
  cctvs: Cctv[];
  onClose: () => void;
};

// 코드 설명: getAvailableSlotNumbers 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAvailableSlotNumbers(slotConfig: CameraSlotConfig[], initialSlotNumber: 1 | 2) {
  // 코드 설명: slotNumbers 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const slotNumbers = slotConfig
    .filter((slot) => slot.cctvId && (slot.slotNumber === 1 || slot.slotNumber === 2))
    .map((slot) => slot.slotNumber as 1 | 2);

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: slotNumbers.length > 0 ? slotNumbers : [initialSlotNumber]
  return slotNumbers.length > 0 ? slotNumbers : [initialSlotNumber];
}

// 코드 설명: getSlotCctv 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getSlotCctv(slotNumber: 1 | 2, slotConfig: CameraSlotConfig[], cctvs: Cctv[]) {
  // 코드 설명: slot 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const slot = slotConfig.find((item) => item.slotNumber === slotNumber);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: cctvs.find((cctv) => cctv.id === slot?.cctvId) ?? cctvs[0]
  return cctvs.find((cctv) => cctv.id === slot?.cctvId) ?? cctvs[0];
}

// 코드 설명: getPolygonPoints 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getPolygonPoints(points: RoiPolygon["points"]) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: points.map((point) => `${point.x},${point.y}`).join(" ")
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

// 코드 설명: RoiSettingsModal 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function RoiSettingsModal({ initialSlotNumber, slotConfig, cctvs, onClose }: RoiSettingsModalProps) {
  // 코드 설명: [activeSlotNumber, setActiveSlotNumber] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [activeSlotNumber, setActiveSlotNumber] = useState<1 | 2>(initialSlotNumber);
  // 코드 설명: [activeRoiIndex, setActiveRoiIndex] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [activeRoiIndex, setActiveRoiIndex] = useState<1 | 2 | 3>(1);
  // 코드 설명: availableSlotNumbers 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const availableSlotNumbers = useMemo(() => getAvailableSlotNumbers(slotConfig, initialSlotNumber), [initialSlotNumber, slotConfig]);
  // 코드 설명: activeCctv 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const activeCctv = useMemo(() => getSlotCctv(activeSlotNumber, slotConfig, cctvs), [activeSlotNumber, cctvs, slotConfig]);
  // 코드 설명: [roiConfig, setRoiConfig] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [roiConfig, setRoiConfig] = useState<CameraRoiConfig>(() => createDefaultCameraRoiConfig(initialSlotNumber, activeCctv.id));
  const [isLoadingRoi, setIsLoadingRoi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // 코드 설명: activePolygon 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const activePolygon = roiConfig.polygons.find((polygon) => polygon.roiIndex === activeRoiIndex) ?? roiConfig.polygons[0];

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !availableSlotNumbers.includes(activeSlotNumber)
    if (!availableSlotNumbers.includes(activeSlotNumber)) {
      // 코드 설명: setActiveSlotNumber 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActiveSlotNumber(availableSlotNumbers[0]);
    }
  }, [activeSlotNumber, availableSlotNumbers]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingRoi(true);
    setActiveRoiIndex(1);
    getCctvRois(activeCctv.id, activeSlotNumber).then((config) => {
      if (!cancelled) {
        setRoiConfig(config);
        setIsLoadingRoi(false);
      }
    }).catch(() => {
      if (!cancelled) setIsLoadingRoi(false);
    });
    return () => { cancelled = true; };
  }, [activeCctv.id, activeSlotNumber]);

  // 코드 설명: updatePolygon 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function updatePolygon(updater: (polygon: RoiPolygon) => RoiPolygon) {
    // 코드 설명: setRoiConfig 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setRoiConfig((current) => ({
      ...current,
      polygons: current.polygons.map((polygon) => (polygon.roiIndex === activeRoiIndex ? updater(polygon) : polygon)),
    }));
  }

  // 코드 설명: handleCanvasClick 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleCanvasClick(event: MouseEvent<SVGSVGElement>) {
    // 코드 설명: rect 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const rect = event.currentTarget.getBoundingClientRect();
    // 코드 설명: displayX 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const displayX = event.clientX - rect.left;
    // 코드 설명: displayY 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const displayY = event.clientY - rect.top;
    // 코드 설명: scaleX 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const scaleX = ORIGINAL_WIDTH / rect.width;
    // 코드 설명: scaleY 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const scaleY = ORIGINAL_HEIGHT / rect.height;
    // 코드 설명: point 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const point = {
      x: Math.round(displayX * scaleX),
      y: Math.round(displayY * scaleY),
    };

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: updatePolygon((polygon) => ({ ...polygon, points: [...polygon.points, p…
    updatePolygon((polygon) => ({ ...polygon, points: [...polygon.points, point] }));
  }

  // 코드 설명: handleTypeChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleTypeChange(roiType: RoiType) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: updatePolygon((polygon) => ({ ...polygon, roiType }));
    updatePolygon((polygon) => ({ ...polygon, roiType }));
  }

  // 코드 설명: handleNameChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleNameChange(roiName: string) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: updatePolygon((polygon) => ({ ...polygon, roiName }));
    updatePolygon((polygon) => ({ ...polygon, roiName }));
  }

  // 코드 설명: handleDeletePoint 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleDeletePoint(index: number) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: updatePolygon((polygon) => ({ ...polygon, points: polygon.points.filter…
    updatePolygon((polygon) => ({ ...polygon, points: polygon.points.filter((_, pointIndex) => pointIndex !== index) }));
  }

  // 코드 설명: handleResetPolygon 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleResetPolygon() {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: updatePolygon((polygon) => ({ ...polygon, points: [] }));
    updatePolygon((polygon) => ({ ...polygon, points: [] }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const normalized: CameraRoiConfig = {
        ...roiConfig,
        cameraSlotNumber: activeSlotNumber,
        cctvId: activeCctv.id,
        originalWidth: ORIGINAL_WIDTH,
        originalHeight: ORIGINAL_HEIGHT,
        polygons: roiConfig.polygons.map((polygon) => ({
          ...polygon,
          cameraSlotNumber: activeSlotNumber,
          cctvId: activeCctv.id,
          points: polygon.points.map((p) => ({
            x: Math.max(0, Math.min(ORIGINAL_WIDTH, Math.round(p.x))),
            y: Math.max(0, Math.min(ORIGINAL_HEIGHT, Math.round(p.y))),
          })),
        })),
      };
      await saveCctvRois(activeCctv.id, normalized);
      setRoiConfig(normalized);
      window.alert(`${activeSlotNumber}번 카메라 ROI가 서버에 저장되었습니다.`);
    } catch (error) {
      window.alert(`저장 실패: ${error instanceof Error ? error.message : "서버 오류가 발생했습니다."}`);
    } finally {
      setIsSaving(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6">
      <section className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">ROI 설정</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">ROI 좌표를 서버에 저장합니다. 원본 기준 {ORIGINAL_WIDTH} x {ORIGINAL_HEIGHT}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="닫기">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {availableSlotNumbers.map((slotNumber) => (
                <button
                  key={slotNumber}
                  type="button"
                  onClick={() => setActiveSlotNumber(slotNumber as 1 | 2)}
                  className={`h-10 rounded-lg border px-4 text-sm font-black transition ${activeSlotNumber === slotNumber ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {slotNumber}번 카메라 ROI 설정
                </button>
              ))}
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
                {activeCctv.cctvCode} · {activeCctv.roadName} {activeCctv.locationName}
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
              <div className="relative aspect-video bg-slate-900">
                {activeCctv.streamUrl ? (
                  <img
                    src={activeCctv.streamUrl}
                    alt={`${activeCctv.cctvCode ?? activeCctv.id} ROI preview`}
                    className="absolute inset-0 h-full w-full object-contain"
                    onError={(event) => {
                      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.currentTarget.style.display = "none";
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <svg
                  viewBox={`0 0 ${ORIGINAL_WIDTH} ${ORIGINAL_HEIGHT}`}
                  className="absolute inset-0 h-full w-full cursor-crosshair"
                  onClick={handleCanvasClick}
                  role="img"
                  aria-label="ROI 좌표 편집 영역"
                >
                  {roiConfig.polygons.map((polygon) => {
                    // 코드 설명: color 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                    const color = roiColors[polygon.roiType];
                    // 코드 설명: points 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                    const points = getPolygonPoints(polygon.points);

                    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
                    return (
                      <g key={polygon.id} opacity={polygon.roiIndex === activeRoiIndex ? 1 : 0.35}>
                        {polygon.points.length >= 3 ? <polygon points={points} fill={color} fillOpacity="0.18" stroke={color} strokeWidth="5" /> : null}
                        {polygon.points.length > 1 ? <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeDasharray={polygon.points.length >= 3 ? "0" : "12 10"} /> : null}
                        {polygon.points.map((point, index) => (
                          <g key={`${polygon.id}-${point.x}-${point.y}-${index}`}>
                            <circle cx={point.x} cy={point.y} r="14" fill={color} stroke="white" strokeWidth="4" />
                            <text x={point.x + 22} y={point.y - 18} fill="white" fontSize="34" fontWeight="800">{index + 1}</text>
                          </g>
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          <aside className="grid content-start gap-4">
            <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-sm font-semibold leading-6 text-green-800">
              <b className="block text-green-950">서버 저장 · DB 반영</b>
              저장 시 Flask DB에 기록되며 AI 분석에 즉시 적용됩니다. 클릭한 점은 {ORIGINAL_WIDTH} x {ORIGINAL_HEIGHT} 원본 기준 좌표로 변환합니다.
            </div>
            {isLoadingRoi && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-500">서버에서 ROI 정보를 불러오는 중...</p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {roiConfig.polygons.map((polygon) => (
                <button
                  key={polygon.id}
                  type="button"
                  onClick={() => setActiveRoiIndex(polygon.roiIndex)}
                  className={`rounded-lg border p-3 text-left transition ${polygon.roiIndex === activeRoiIndex ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  <b className="block text-sm">Polygon {polygon.roiIndex}</b>
                  <span className="mt-1 block text-xs font-semibold opacity-75">{polygon.points.length}점</span>
                </button>
              ))}
            </div>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              ROI 이름
              <input value={activePolygon.roiName} onChange={(event) => handleNameChange(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold" />
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              ROI 타입
              <select value={activePolygon.roiType} onChange={(event) => handleTypeChange(event.target.value as RoiType)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold">
                {Object.entries(roiTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-black text-slate-950">좌표 보기</h3>
                <Eye className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>
              <div className="grid max-h-52 gap-2 overflow-y-auto pr-1">
                {activePolygon.points.map((point, index) => (
                  <div key={`${point.x}-${point.y}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-600">
                    <span>{index + 1}. x {point.x}, y {point.y}</span>
                    <button type="button" onClick={() => handleDeletePoint(index)} className="grid h-7 w-7 place-items-center rounded border border-red-100 text-red-600 hover:bg-red-50" aria-label="점 삭제">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {activePolygon.points.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-500">영상 영역을 클릭해 점을 추가하세요.</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleResetPolygon} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Polygon 초기화</button>
              <button type="button" onClick={handleSave} disabled={isSaving || isLoadingRoi} className="inline-flex h-10 items-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white transition hover:bg-staccato-dark disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="h-4 w-4" aria-hidden="true" />
                {isSaving ? "저장 중..." : "서버에 ROI 저장"}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
