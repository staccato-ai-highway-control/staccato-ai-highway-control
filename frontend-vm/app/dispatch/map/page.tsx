"use client";

import Link from "next/link";
import { AlertTriangle, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { ExternalMap } from "@/components/map/ExternalMap";
import { getStoredAuthUser } from "@/lib/authStorage";
import { mockIncidents } from "@/features/incidents/mock";
import {
  incidentStatusLabels,
  incidentTypeLabels,
  riskLevelLabels,
  type Incident,
  type RiskLevel,
} from "@/features/incidents/types";
import type { AuthUser, UserRole } from "@/features/auth/types";

type DispatchMarker = {
  incident: Incident;
  x: number;
  y: number;
  latitude: number;
  longitude: number;
};

const markerPositions: Record<string, Omit<DispatchMarker, "incident">> = {
  "inc-001": { x: 28, y: 38, latitude: 37.2712, longitude: 127.0361 },
  "inc-002": { x: 58, y: 48, latitude: 37.2411, longitude: 127.1776 },
  "inc-003": { x: 34, y: 55, latitude: 37.2523, longitude: 126.9234 },
  "inc-004": { x: 74, y: 67, latitude: 36.9438, longitude: 127.4887 },
  "inc-005": { x: 36, y: 54, latitude: 37.3219, longitude: 126.8309 },
  "inc-006": { x: 52, y: 72, latitude: 36.8151, longitude: 127.1139 },
};

function getRiskTone(riskLevel: RiskLevel) {
  if (riskLevel === "CRITICAL") return "red";
  if (riskLevel === "HIGH") return "amber";
  if (riskLevel === "MEDIUM") return "blue";
  return "green";
}

function isMaintainerRole(role: UserRole | null | undefined) {
  return role === "MAINTAINER" || role === "DISPATCH_ADMIN";
}

function hasAssignee(incident: Incident) {
  return Boolean(incident.assignee?.trim() && incident.assignee !== "미배정");
}

function isAssignedToUser(incident: Incident, user: AuthUser | null) {
  const assignee = incident.assignee?.trim();
  if (!assignee || assignee === "미배정") return false;

  const candidates = [user?.name, user?.login_id, user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim());

  return candidates.length > 0 && candidates.includes(assignee);
}

function buildMarkers(incidents: Incident[]): DispatchMarker[] {
  return incidents.map((incident, index) => ({
    incident,
    ...(markerPositions[incident.id] ?? {
      x: 24 + index * 9,
      y: 36 + index * 7,
      latitude: 37.2 + index * 0.02,
      longitude: 127.0 + index * 0.04,
    }),
  }));
}

function getMarkerKey(marker: DispatchMarker, role: UserRole | "NO_ROLE") {
  return `${role}-DISPATCH-${marker.incident.id}`;
}

export default function DispatchMapPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [selectedMarkerKey, setSelectedMarkerKey] = useState("");

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const role = authUser?.role;
  const roleKey = role ?? "NO_ROLE";
  const isMaintainer = isMaintainerRole(role);
  const canViewAllDispatch = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";

  const visibleIncidents = useMemo(() => {
    if (canViewAllDispatch) {
      return mockIncidents.filter((incident) => hasAssignee(incident));
    }

    return mockIncidents.filter((incident) => isAssignedToUser(incident, authUser));
  }, [authUser, canViewAllDispatch]);

  const markers = useMemo(() => buildMarkers(visibleIncidents), [visibleIncidents]);
  const selectedMarker =
    markers.find((marker) => getMarkerKey(marker, roleKey) === selectedMarkerKey) ?? markers[0];

  useEffect(() => {
    if (!selectedMarkerKey && markers[0]) {
      setSelectedMarkerKey(getMarkerKey(markers[0], roleKey));
    }
  }, [markers, roleKey, selectedMarkerKey]);

  const pageDescription = isMaintainer
    ? "내게 배정된 출동 사건의 위치와 이동 정보를 확인합니다."
    : role === "CONTROL_ADMIN"
      ? "출동 배정된 사고 위치를 확인하고 출동 관리 화면으로 이동합니다."
      : "전체 출동 배정 사고 위치와 처리 현황을 확인합니다.";

  return (
    <RequireAuth>
      <AppLayout title="지도/위치 확인">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">지도/위치 확인</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {pageDescription}
            </p>
          </div>
          <Link
            href="/dispatch/incidents"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50"
          >
            {isMaintainer ? "내 출동 목록" : "출동 관리"}
          </Link>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="font-black text-slate-950">배정 사건 위치 지도</h3>
                <p className="text-xs font-semibold text-slate-400">
                  {isMaintainer
                    ? "전체 CCTV와 타 담당자 사건은 지도 모니터링 화면에서만 표시합니다."
                    : "CCTV 위치는 지도 모니터링 화면에서 확인하고, 이 화면은 출동 배정 사건 위치만 표시합니다."}
                </p>
              </div>
            </div>

            {markers.length === 0 ? (
              <div className="grid min-h-[620px] place-items-center bg-slate-50 p-6">
                <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <MapPin className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-black text-slate-950">배정된 사건이 없습니다.</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {isMaintainer
                      ? "현재 계정 이름과 일치하는 출동 배정 사건만 이 화면에 표시됩니다."
                      : "현재 표시할 출동 배정 사건이 없습니다."}
                  </p>
                </div>
              </div>
            ) : (
              <ExternalMap
                markers={markers.map((marker) => ({
                  id: getMarkerKey(marker, roleKey),
                  title: marker.incident.title,
                  latitude: marker.latitude,
                  longitude: marker.longitude,
                  type: "출동 사건",
                }))}
                selectedMarkerId={selectedMarker ? getMarkerKey(selectedMarker, roleKey) : undefined}
                onMarkerSelect={setSelectedMarkerKey}
              />
            )}
          </Card>

          <aside className="grid content-start gap-5">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">{isMaintainer ? "내 배정 현황" : "출동 위치 현황"}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {isMaintainer ? authUser?.name ?? authUser?.login_id ?? "현재 계정" : "담당자 배정 사건"}
                  </p>
                </div>
                <Badge tone="amber">{markers.length}건</Badge>
              </div>
            </Card>

            {selectedMarker ? (
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">선택 사건</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {selectedMarker.incident.code}
                    </p>
                  </div>
                  <Badge tone={getRiskTone(selectedMarker.incident.riskLevel)}>
                    {riskLevelLabels[selectedMarker.incident.riskLevel]}
                  </Badge>
                </div>

                <dl className="mt-5 grid gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-black text-slate-400">사건명</dt>
                    <dd className="mt-1 text-sm font-bold text-slate-800">{selectedMarker.incident.title}</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-black text-slate-400">유형</dt>
                    <dd className="mt-1 text-sm font-bold text-slate-800">
                      {incidentTypeLabels[selectedMarker.incident.eventType]}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-black text-slate-400">위치</dt>
                    <dd className="mt-1 text-sm font-bold text-slate-800">{selectedMarker.incident.location}</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-black text-slate-400">상태</dt>
                    <dd className="mt-1 text-sm font-bold text-slate-800">
                      {incidentStatusLabels[selectedMarker.incident.status]}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-black text-slate-400">위도/경도</dt>
                    <dd className="mt-1 text-sm font-bold text-slate-800">
                      {selectedMarker.latitude}, {selectedMarker.longitude}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-black text-slate-400">출동 ETA</dt>
                    <dd className="mt-1 text-sm font-bold text-slate-800">
                      {selectedMarker.incident.its.nearestPatrolEta}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={isMaintainer ? `/dispatch/incidents/${selectedMarker.incident.id}` : `/incidents/${selectedMarker.incident.id}`}
                    className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-bold text-white no-underline transition hover:bg-slate-800"
                  >
                    사고 상세
                  </Link>
                  <Link
                    href={isMaintainer ? `/dispatch/incidents/${selectedMarker.incident.id}` : "/dispatch"}
                    className="inline-flex h-10 items-center rounded-lg border border-amber-200 px-4 text-sm font-bold text-amber-700 no-underline transition hover:bg-amber-50"
                  >
                    {isMaintainer ? "처리 상태 변경" : "출동 관리"}
                  </Link>
                </div>
              </Card>
            ) : null}

            <Card className="p-5">
              <h3 className="font-black text-slate-950">배정 사건 목록</h3>
              <div className="mt-4 grid gap-3">
                {markers.map((marker) => (
                  <button
                    key={getMarkerKey(marker, roleKey)}
                    type="button"
                    onClick={() => setSelectedMarkerKey(getMarkerKey(marker, roleKey))}
                    className="rounded-lg border border-slate-100 p-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{marker.incident.title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{marker.incident.location}</p>
                      </div>
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </aside>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
