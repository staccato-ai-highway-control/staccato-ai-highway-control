"use client";

import { Eye, Save, Trash2, X } from "lucide-react";
import { MouseEvent, useEffect, useMemo, useState } from "react";
import type { Cctv } from "@/types/cctv";
import {
  getCameraRoiConfig,
  ORIGINAL_HEIGHT,
  ORIGINAL_WIDTH,
  saveCameraRoiConfig,
  type CameraRoiConfig,
  type CameraSlotConfig,
  type RoiPolygon,
  type RoiType,
} from "@/features/cctvs/api";

const roiTypeLabels: Record<RoiType, string> = {
  DRIVING_LANE: "DRIVING_LANE · 주행 차로 분석 대상",
  SHOULDER: "SHOULDER · 갓길 정차 분석 대상",
  IGNORE_ZONE: "IGNORE_ZONE · 고속도로 밖 차량 제거 영역",
};

const roiColors: Record<RoiType, string> = {
  DRIVING_LANE: "#22c55e",
  SHOULDER: "#f59e0b",
  IGNORE_ZONE: "#ef4444",
};

type RoiSettingsModalProps = {
  initialSlotNumber: 1 | 2;
  slotConfig: CameraSlotConfig[];
  cctvs: Cctv[];
  onClose: () => void;
};

function getAvailableSlotNumbers(slotConfig: CameraSlotConfig[], initialSlotNumber: 1 | 2) {
  const slotNumbers = slotConfig
    .filter((slot) => slot.cctvId && (slot.slotNumber === 1 || slot.slotNumber === 2))
    .map((slot) => slot.slotNumber as 1 | 2);

  return slotNumbers.length > 0 ? slotNumbers : [initialSlotNumber];
}

function getSlotCctv(slotNumber: 1 | 2, slotConfig: CameraSlotConfig[], cctvs: Cctv[]) {
  const slot = slotConfig.find((item) => item.slotNumber === slotNumber);
  return cctvs.find((cctv) => cctv.id === slot?.cctvId) ?? cctvs[0];
}

function getPolygonPoints(points: RoiPolygon["points"]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function RoiSettingsModal({ initialSlotNumber, slotConfig, cctvs, onClose }: RoiSettingsModalProps) {
  const [activeSlotNumber, setActiveSlotNumber] = useState<1 | 2>(initialSlotNumber);
  const [activeRoiIndex, setActiveRoiIndex] = useState<1 | 2 | 3>(1);
  const availableSlotNumbers = useMemo(() => getAvailableSlotNumbers(slotConfig, initialSlotNumber), [initialSlotNumber, slotConfig]);
  const activeCctv = useMemo(() => getSlotCctv(activeSlotNumber, slotConfig, cctvs), [activeSlotNumber, cctvs, slotConfig]);
  const [roiConfig, setRoiConfig] = useState<CameraRoiConfig>(() => getCameraRoiConfig(initialSlotNumber, activeCctv.id));
  const activePolygon = roiConfig.polygons.find((polygon) => polygon.roiIndex === activeRoiIndex) ?? roiConfig.polygons[0];

  useEffect(() => {
    if (!availableSlotNumbers.includes(activeSlotNumber)) {
      setActiveSlotNumber(availableSlotNumbers[0]);
    }
  }, [activeSlotNumber, availableSlotNumbers]);

  useEffect(() => {
    setRoiConfig(getCameraRoiConfig(activeSlotNumber, activeCctv.id));
    setActiveRoiIndex(1);
  }, [activeCctv.id, activeSlotNumber]);

  function updatePolygon(updater: (polygon: RoiPolygon) => RoiPolygon) {
    setRoiConfig((current) => ({
      ...current,
      polygons: current.polygons.map((polygon) => (polygon.roiIndex === activeRoiIndex ? updater(polygon) : polygon)),
    }));
  }

  function handleCanvasClick(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;
    const scaleX = ORIGINAL_WIDTH / rect.width;
    const scaleY = ORIGINAL_HEIGHT / rect.height;
    const point = {
      x: Math.round(displayX * scaleX),
      y: Math.round(displayY * scaleY),
    };

    updatePolygon((polygon) => ({ ...polygon, points: [...polygon.points, point] }));
  }

  function handleTypeChange(roiType: RoiType) {
    updatePolygon((polygon) => ({ ...polygon, roiType }));
  }

  function handleNameChange(roiName: string) {
    updatePolygon((polygon) => ({ ...polygon, roiName }));
  }

  function handleDeletePoint(index: number) {
    updatePolygon((polygon) => ({ ...polygon, points: polygon.points.filter((_, pointIndex) => pointIndex !== index) }));
  }

  function handleResetPolygon() {
    updatePolygon((polygon) => ({ ...polygon, points: [] }));
  }

  function handleSave() {
    const saved = saveCameraRoiConfig(activeSlotNumber, {
      ...roiConfig,
      cameraSlotNumber: activeSlotNumber,
      cctvId: activeCctv.id,
    });
    setRoiConfig(saved);
    window.alert(`${activeSlotNumber}번 카메라 ROI 설정이 저장되었습니다.`);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6">
      <section className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">ROI 설정</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">ROI 좌표는 원본 영상 기준 {ORIGINAL_WIDTH} x {ORIGINAL_HEIGHT}으로 저장됩니다.</p>
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
                    const color = roiColors[polygon.roiType];
                    const points = getPolygonPoints(polygon.points);

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
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
              <b className="block text-blue-950">ROI 설정은 현재 선택한 카메라 기준으로 저장됩니다.</b>
              클릭한 점은 화면 크기와 무관하게 {ORIGINAL_WIDTH} x {ORIGINAL_HEIGHT} 원본 기준 좌표로 변환 저장됩니다.
            </div>

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
              <button type="button" onClick={handleSave} className="inline-flex h-10 items-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white transition hover:bg-staccato-dark">
                <Save className="h-4 w-4" aria-hidden="true" />
                전체 ROI 저장
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
