"use client";

import { AlertTriangle, CheckCircle2, Cctv, Flame } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";

type MarkerType = "CCTV" | "INCIDENT" | "CRITICAL_INCIDENT" | "RESOLVED";

type MapMarker = {
  id: string;
  type: MarkerType;
  title: string;
  roadName: string;
  locationName: string;
  status: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  updatedAt: string;
};

type MarkerFilter = MarkerType | "ALL";

const markerFilters: Array<{ label: string; value: MarkerFilter }> = [
  { label: "전체", value: "ALL" },
  { label: "CCTV", value: "CCTV" },
  { label: "사고", value: "INCIDENT" },
  { label: "긴급 사고", value: "CRITICAL_INCIDENT" },
  { label: "처리 완료", value: "RESOLVED" },
];

const mockMarkers: MapMarker[] = [
  {
    id: "map-cctv-001",
    type: "CCTV",
    title: "CCTV-01 수원IC",
    roadName: "경부고속도로",
    locationName: "수원IC",
    status: "정상 연결",
    latitude: 37.2636,
    longitude: 127.0286,
    x: 22,
    y: 42,
    updatedAt: "2026-04-29 10:23:15",
  },
  {
    id: "map-cctv-002",
    type: "CCTV",
    title: "CCTV-02 안산IC",
    roadName: "서해안고속도로",
    locationName: "안산IC",
    status: "정상 연결",
    latitude: 37.3219,
    longitude: 126.8309,
    x: 36,
    y: 54,
    updatedAt: "2026-04-29 10:22:45",
  },
  {
    id: "map-inc-001",
    type: "CRITICAL_INCIDENT",
    title: "주행차로 정차 긴급",
    roadName: "경부고속도로",
    locationName: "수원IC 123.4K",
    status: "검토중",
    riskLevel: "CRITICAL",
    latitude: 37.2712,
    longitude: 127.0361,
    x: 29,
    y: 36,
    updatedAt: "2026-04-29 09:12:30",
  },
  {
    id: "map-inc-002",
    type: "INCIDENT",
    title: "갓길 정차",
    roadName: "영동고속도로",
    locationName: "용인IC 45.1K",
    status: "담당 배정",
    riskLevel: "MEDIUM",
    latitude: 37.2411,
    longitude: 127.1776,
    x: 58,
    y: 48,
    updatedAt: "2026-04-29 09:04:10",
  },
  {
    id: "map-inc-003",
    type: "RESOLVED",
    title: "갓길 정차 처리 완료",
    roadName: "중부고속도로",
    locationName: "대소JC 201.2K",
    status: "처리 완료",
    riskLevel: "LOW",
    latitude: 36.9438,
    longitude: 127.4887,
    x: 74,
    y: 67,
    updatedAt: "2026-04-28 18:11:02",
  },
  {
    id: "map-cctv-003",
    type: "CCTV",
    title: "CCTV-04 대전JC",
    roadName: "중부고속도로",
    locationName: "대전JC",
    status: "AI 감지",
    latitude: 36.3504,
    longitude: 127.3845,
    x: 66,
    y: 78,
    updatedAt: "2026-04-29 10:20:30",
  },
];

const markerStyles: Record<MarkerType, { label: string; buttonClass: string; icon: typeof Cctv }> = {
  CCTV: {
    label: "CCTV",
    buttonClass: "border-emerald-200 bg-emerald-500 text-white shadow-emerald-500/30",
    icon: Cctv,
  },
  INCIDENT: {
    label: "사고",
    buttonClass: "border-amber-200 bg-amber-500 text-white shadow-amber-500/30",
    icon: AlertTriangle,
  },
  CRITICAL_INCIDENT: {
    label: "긴급 사고",
    buttonClass: "border-red-200 bg-red-600 text-white shadow-red-500/40",
    icon: Flame,
  },
  RESOLVED: {
    label: "처리 완료",
    buttonClass: "border-slate-200 bg-slate-500 text-white shadow-slate-500/20",
    icon: CheckCircle2,
  },
};

function riskTone(riskLevel?: MapMarker["riskLevel"]) {
  if (riskLevel === "CRITICAL") return "red";
  if (riskLevel === "HIGH") return "amber";
  if (riskLevel === "MEDIUM") return "blue";
  return "slate";
}

export default function MapPage() {
  const [filter, setFilter] = useState<MarkerFilter>("ALL");
  const [selectedMarkerId, setSelectedMarkerId] = useState(mockMarkers[0].id);

  const filteredMarkers = useMemo(() => {
    if (filter === "ALL") return mockMarkers;
    return mockMarkers.filter((marker) => marker.type === filter);
  }, [filter]);

  const selectedMarker =
    mockMarkers.find((marker) => marker.id === selectedMarkerId) ??
    filteredMarkers[0] ??
    mockMarkers[0];

  return (
    <RequireAuth>
      <AppLayout title="지도 관제">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">지도 관제</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              CCTV와 사고 이벤트를 지도 기반으로 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {markerFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`h-10 rounded-lg border px-4 text-sm font-black transition ${
                  filter === item.value
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="font-black text-slate-950">고속도로 관제 지도</h3>
                <p className="text-xs font-semibold text-slate-400">
                  TODO: 지도 SDK 연동 시 Flask 설정을 통해 안전하게 키를 주입합니다. 프론트 코드에 API Key를 직접 포함하지 않습니다.
                </p>
              </div>
            </div>
            <div className="relative min-h-[620px] overflow-hidden bg-slate-100">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:48px_48px]" />
              <div className="absolute left-[10%] top-[22%] h-[58%] w-[78%] rounded-[45%] border-[18px] border-slate-300/70" />
              <div className="absolute left-[16%] top-[35%] h-5 w-[70%] -rotate-12 rounded-full bg-slate-400/60" />
              <div className="absolute left-[20%] top-[58%] h-5 w-[62%] rotate-6 rounded-full bg-slate-400/50" />
              <div className="absolute left-[46%] top-[16%] h-[70%] w-5 rotate-12 rounded-full bg-slate-400/50" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-emerald-100/70" />

              {filteredMarkers.map((marker) => {
                const style = markerStyles[marker.type];
                const Icon = style.icon;
                const isSelected = marker.id === selectedMarker.id;

                return (
                  <button
                    key={marker.id}
                    type="button"
                    onClick={() => setSelectedMarkerId(marker.id)}
                    className={`absolute grid h-11 w-11 place-items-center rounded-full border-2 shadow-lg transition hover:scale-110 ${style.buttonClass} ${isSelected ? "ring-4 ring-white" : ""}`}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    aria-label={marker.title}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </Card>

          <aside className="grid content-start gap-5">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">선택 상세</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{selectedMarker.title}</p>
                </div>
                <Badge tone={selectedMarker.type === "CRITICAL_INCIDENT" ? "red" : selectedMarker.type === "INCIDENT" ? "amber" : selectedMarker.type === "RESOLVED" ? "green" : "blue"}>
                  {markerStyles[selectedMarker.type].label}
                </Badge>
              </div>
              <dl className="mt-5 grid gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-black text-slate-400">도로명</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-800">{selectedMarker.roadName}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-black text-slate-400">위치</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-800">{selectedMarker.locationName}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-black text-slate-400">상태</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-800">{selectedMarker.status}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-black text-slate-400">위도/경도</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-800">
                    {selectedMarker.latitude}, {selectedMarker.longitude}
                  </dd>
                </div>
                {selectedMarker.riskLevel ? (
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-black text-slate-400">위험도</dt>
                    <dd className="mt-1">
                      <Badge tone={riskTone(selectedMarker.riskLevel)}>{selectedMarker.riskLevel}</Badge>
                    </dd>
                  </div>
                ) : null}
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-black text-slate-400">최근 업데이트</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-800">{selectedMarker.updatedAt}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-5">
              <h3 className="font-black text-slate-950">마커 현황</h3>
              <div className="mt-4 grid gap-3">
                {Object.entries(markerStyles).map(([type, style]) => {
                  const count = mockMarkers.filter((marker) => marker.type === type).length;
                  const Icon = style.icon;

                  return (
                    <div key={type} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {style.label}
                      </span>
                      <strong className="text-sm text-slate-950">{count}</strong>
                    </div>
                  );
                })}
              </div>
            </Card>
          </aside>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
