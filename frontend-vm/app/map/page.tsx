"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Cctv, Flame } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { ExternalMap } from "@/components/map/ExternalMap";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { mockIncidents } from "@/features/incidents/mock";
import type { Incident, RiskLevel } from "@/features/incidents/types";
import { getStoredAuthUser } from "@/lib/authStorage";

type MarkerType = "CCTV" | "INCIDENT" | "CRITICAL_INCIDENT" | "RESOLVED";

type MapMarker = {
  id: string;
  type: MarkerType;
  incidentId?: string;
  title: string;
  roadName: string;
  locationName: string;
  status: string;
  riskLevel?: RiskLevel;
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  updatedAt: string;
};

type MarkerFilter = MarkerType | "ALL";
type ControlMarkerFilter = "ALL_INCIDENTS" | "IN_PROGRESS" | "ASSIGNED";
type RiskFilter = "ALL" | RiskLevel;

const markerFilters: Array<{ label: string; value: MarkerFilter }> = [
  { label: "전체", value: "ALL" },
  { label: "CCTV", value: "CCTV" },
  { label: "사고", value: "INCIDENT" },
  { label: "긴급 사고", value: "CRITICAL_INCIDENT" },
  { label: "처리 완료", value: "RESOLVED" },
];

const controlMarkerFilters: Array<{ label: string; value: ControlMarkerFilter }> = [
  { label: "전체 사고", value: "ALL_INCIDENTS" },
  { label: "처리 중", value: "IN_PROGRESS" },
  { label: "출동 배정", value: "ASSIGNED" },
];

const riskFilters: Array<{ label: string; value: RiskFilter }> = [
  { label: "전체 위험도", value: "ALL" },
  { label: "낮음", value: "LOW" },
  { label: "보통", value: "MEDIUM" },
  { label: "높음", value: "HIGH" },
  { label: "긴급", value: "CRITICAL" },
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
    incidentId: "inc-001",
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
    incidentId: "inc-002",
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
    incidentId: "inc-004",
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

function getRole(user: AuthUser | null): UserRole | null {
  return user?.role ?? null;
}

function isMaintainerRole(role: UserRole | null) {
  return role === "MAINTAINER" || role === "DISPATCH_ADMIN";
}

function isIncidentMarker(marker: MapMarker) {
  return marker.type === "INCIDENT" || marker.type === "CRITICAL_INCIDENT" || marker.type === "RESOLVED";
}

function getIncident(marker: MapMarker): Incident | undefined {
  return marker.incidentId
    ? mockIncidents.find((incident) => incident.id === marker.incidentId)
    : undefined;
}

function isAssignedToUser(incident: Incident | undefined, user: AuthUser | null) {
  if (!incident) return false;

  const assignee = incident.assignee?.trim();
  if (!assignee || assignee === "미배정") return false;

  const candidates = [user?.name, user?.login_id, user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim());

  return candidates.includes(assignee);
}

function hasDispatchAssignee(incident: Incident | undefined) {
  return Boolean(incident?.assignee?.trim() && incident.assignee !== "미배정");
}

function matchesControlFilter(marker: MapMarker, filter: ControlMarkerFilter) {
  const incident = getIncident(marker);

  if (!isIncidentMarker(marker)) return false;
  if (filter === "IN_PROGRESS") return incident?.status === "REVIEWING" || incident?.status === "ASSIGNED";
  if (filter === "ASSIGNED") return hasDispatchAssignee(incident);
  return true;
}

function getMapMarkerKey(marker: MapMarker, role: UserRole | "NO_ROLE") {
  return `${role}-${marker.type}-${marker.id}`;
}

export default function MapPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [filter, setFilter] = useState<MarkerFilter>("ALL");
  const [controlFilter, setControlFilter] = useState<ControlMarkerFilter>("ALL_INCIDENTS");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [selectedMarkerKey, setSelectedMarkerKey] = useState("");

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const role = getRole(authUser);
  const roleKey = role ?? "NO_ROLE";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isControlAdmin = role === "CONTROL_ADMIN";
  const isMaintainer = isMaintainerRole(role);

  const filteredMarkers = useMemo(() => {
    if (isMaintainer) {
      return mockMarkers.filter((marker) => isAssignedToUser(getIncident(marker), authUser));
    }

    if (isControlAdmin) {
      return mockMarkers.filter((marker) => matchesControlFilter(marker, controlFilter));
    }

    return mockMarkers.filter((marker) => {
      const typeMatched = filter === "ALL" || marker.type === filter;
      const riskMatched = riskFilter === "ALL" || marker.riskLevel === riskFilter;
      return typeMatched && riskMatched;
    });
  }, [authUser, controlFilter, filter, isControlAdmin, isMaintainer, riskFilter]);

  const selectedMarker =
    filteredMarkers.find((marker) => getMapMarkerKey(marker, roleKey) === selectedMarkerKey) ??
    filteredMarkers[0];
  const selectedIncident = selectedMarker ? getIncident(selectedMarker) : undefined;

  const pageDescription = isMaintainer
    ? "내게 배정된 사고 위치만 지도에서 확인합니다."
    : isControlAdmin
      ? "전체 사고, 처리 중 사고, 출동 배정 사고 위치를 확인합니다."
      : "전체 사고 위치, 출동 위치, CCTV 위치를 지도 기반으로 확인합니다.";

  const visibleFilters = isControlAdmin ? controlMarkerFilters : markerFilters;

  return (
    <RequireAuth>
      <AppLayout title="지도 관제">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">지도 관제</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {pageDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isMaintainer ? (
              <Badge tone="amber">내 배정 사고만</Badge>
            ) : (
              visibleFilters.map((item) => {
                const isActive = isControlAdmin
                  ? controlFilter === item.value
                  : filter === item.value;

                return (
                  <button
                    key={`${roleKey}-${item.value}`}
                    type="button"
                    onClick={() => {
                      if (isControlAdmin) setControlFilter(item.value as ControlMarkerFilter);
                      else setFilter(item.value as MarkerFilter);
                    }}
                    className={`h-10 rounded-lg border px-4 text-sm font-black transition ${
                      isActive
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })
            )}
            {isSuperAdmin ? (
              <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                {riskFilters.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            ) : null}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="font-black text-slate-950">고속도로 관제 지도</h3>
                <p className="text-xs font-semibold text-slate-400">
                  Flask 지도 설정 API를 통해 SDK 키를 받아 실제 지도를 표시합니다.
                </p>
              </div>
            </div>
            <ExternalMap
              markers={filteredMarkers.map((marker) => ({
                id: getMapMarkerKey(marker, roleKey),
                title: marker.title,
                latitude: marker.latitude,
                longitude: marker.longitude,
                type: markerStyles[marker.type].label,
              }))}
              selectedMarkerId={selectedMarker ? getMapMarkerKey(selectedMarker, roleKey) : undefined}
              onMarkerSelect={setSelectedMarkerKey}
            />
          </Card>

          <aside className="grid content-start gap-5">
            <Card className="p-5">
              {selectedMarker ? (
                <>
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
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedIncident ? (
                  <Link href={`/incidents/${selectedIncident.id}`} className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-bold text-white no-underline transition hover:bg-slate-800">
                    사고 상세
                  </Link>
                ) : null}
                {isControlAdmin && selectedIncident ? (
                  <Link href="/dispatch" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50">
                    출동 관리
                  </Link>
                ) : null}
                {isMaintainer && selectedIncident ? (
                  <Link href={`/dispatch/incidents/${selectedIncident.id}`} className="inline-flex h-10 items-center rounded-lg border border-amber-200 px-4 text-sm font-bold text-amber-700 no-underline transition hover:bg-amber-50">
                    처리 상태 변경
                  </Link>
                ) : null}
              </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <h3 className="text-lg font-black text-slate-950">표시할 위치가 없습니다.</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    현재 권한과 필터 조건에 맞는 지도 마커가 없습니다.
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-black text-slate-950">마커 현황</h3>
              <div className="mt-4 grid gap-3">
                {Object.entries(markerStyles).map(([type, style]) => {
                  if (isMaintainer && type === "CCTV") return null;
                  if (isControlAdmin && type === "CCTV") return null;

                  const count = filteredMarkers.filter((marker) => marker.type === type).length;
                  const Icon = style.icon;

                  return (
                    <div key={`${roleKey}-${type}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
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
