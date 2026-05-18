"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  History,
  MapPin,
  MessageSquare,
  Play,
  Search,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import { Badge } from "@/components/common/Badge";
import { getStoredAuthUser } from "@/lib/authStorage";
import { mockIncidents } from "@/features/incidents/mock";
import {
  incidentTypeLabels,
  type Incident,
  type IncidentStatus,
} from "@/features/incidents/types";
import type { AuthUser, UserRole } from "@/features/auth/types";

type DispatchStatus = "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type MaintainerDispatchFilter = "ASSIGNED" | "IN_PROGRESS" | "RESOLVED";

const dispatchStatuses: IncidentStatus[] = ["REVIEWING", "ASSIGNED", "RESOLVED", "CLOSED"];

const maintainerFilterOptions: Array<{ label: string; value: MaintainerDispatchFilter }> = [
  { label: "출동 대기", value: "ASSIGNED" },
  { label: "출동 중", value: "IN_PROGRESS" },
  { label: "처리 완료", value: "RESOLVED" },
];

const dispatchStatusLabels: Record<DispatchStatus, string> = {
  ASSIGNED: "배정됨",
  IN_PROGRESS: "출동/처리 중",
  RESOLVED: "처리 완료",
  CLOSED: "종료",
};

function getRole(user: AuthUser | null): UserRole | null {
  return user?.role ?? null;
}

function isMaintainerRole(role: UserRole | null) {
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

  return candidates.includes(assignee);
}

function getDispatchStatus(incident: Incident): DispatchStatus {
  if (incident.status === "CLOSED") return "CLOSED";
  if (incident.status === "RESOLVED") return "RESOLVED";
  if (incident.status === "REVIEWING") return "IN_PROGRESS";
  return "ASSIGNED";
}

function matchesMaintainerFilter(incident: Incident, filter: MaintainerDispatchFilter) {
  return getDispatchStatus(incident) === filter;
}

function matchesSearch(incident: Incident, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;

  return [incident.code, incident.title, incident.roadName, incident.location]
    .join(" ")
    .toLowerCase()
    .includes(normalizedKeyword);
}

function handleMockAction(action: string, incidentCode: string) {
  window.alert(`${incidentCode} ${action} 기능은 API 확정 후 연결 예정입니다.`);
}

export default function DispatchIncidentsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [maintainerFilter, setMaintainerFilter] = useState<MaintainerDispatchFilter>("ASSIGNED");
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const role = getRole(authUser);
  const isMaintainer = isMaintainerRole(role);
  const canAssignDispatcher = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canChangeStatus = role === "SUPER_ADMIN";
  const canViewHistory = role === "SUPER_ADMIN";
  const canWriteControlMemo = role === "CONTROL_ADMIN";
  const canMessageMaintainer = role === "CONTROL_ADMIN";
  const canUseMaintainerActions = isMaintainer;

  const dispatchIncidents = useMemo(() => {
    return mockIncidents
      .filter((incident) => dispatchStatuses.includes(incident.status))
      .filter((incident) => {
        if (isMaintainer) {
          return (
            isAssignedToUser(incident, authUser) &&
            matchesMaintainerFilter(incident, maintainerFilter)
          );
        }

        return hasAssignee(incident);
      })
      .filter((incident) => matchesSearch(incident, searchKeyword));
  }, [authUser, isMaintainer, maintainerFilter, searchKeyword]);

  const totalDispatchIncidents = useMemo(() => {
    return mockIncidents.filter((incident) => dispatchStatuses.includes(incident.status) && hasAssignee(incident));
  }, []);

  const stats = useMemo(() => {
    return {
      total: totalDispatchIncidents.length,
      assigned: totalDispatchIncidents.filter((incident) => getDispatchStatus(incident) === "ASSIGNED").length,
      inProgress: totalDispatchIncidents.filter((incident) => getDispatchStatus(incident) === "IN_PROGRESS").length,
      done: totalDispatchIncidents.filter((incident) => ["RESOLVED", "CLOSED"].includes(getDispatchStatus(incident))).length,
    };
  }, [totalDispatchIncidents]);

  const pageDescription = isMaintainer
    ? "내게 배정된 출동 건을 출동 대기, 출동 중, 처리 완료 상태로 관리합니다."
    : role === "CONTROL_ADMIN"
      ? "전체 출동 목록과 사고/출동 상태를 확인하고 담당자 배정, 관제 메모, 메시지를 처리합니다."
      : "전체 출동 목록, 담당자 배정, 상태 변경, 처리 이력과 전체 출동 통계를 관리합니다.";

  return (
    <RequireAuth>
      <AppLayout title="출동 관리">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">출동 관리</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {pageDescription}
            </p>
          </div>
          <Badge tone="amber">{dispatchIncidents.length}건 표시</Badge>
        </section>

        {!isMaintainer ? (
          <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "전체 출동", value: stats.total, tone: "slate" as const },
              { label: "배정됨", value: stats.assigned, tone: "blue" as const },
              { label: "출동/처리 중", value: stats.inProgress, tone: "amber" as const },
              { label: "완료/종료", value: stats.done, tone: "green" as const },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{item.label}</p>
                <div className="mt-3 flex items-end justify-between">
                  <strong className="text-3xl font-black text-slate-950">{item.value}</strong>
                  <Badge tone={item.tone}>통계</Badge>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className={isMaintainer ? "grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center" : "relative"}>
            <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="사건 코드, 도로명, 위치 검색"
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white"
            />
            </div>
            {isMaintainer ? (
              <select value={maintainerFilter} onChange={(event) => setMaintainerFilter(event.target.value as MaintainerDispatchFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                {maintainerFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">incident_code</th>
                  <th className="px-4 py-3">유형</th>
                  <th className="px-4 py-3">사건</th>
                  <th className="px-4 py-3">위치</th>
                  <th className="px-4 py-3">위험도</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">출동 상태</th>
                  <th className="px-4 py-3">출동 ETA</th>
                  <th className="px-4 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {dispatchIncidents.map((incident) => (
                  <tr key={incident.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4 font-bold text-slate-700">{incident.code}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{incidentTypeLabels[incident.eventType]}</td>
                    <td className="px-4 py-4">
                      <b className="text-slate-950">{incident.title}</b>
                      <p className="mt-1 text-xs font-semibold text-slate-400">담당자 {incident.assignee}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                        <span className="font-semibold text-slate-600">{incident.location}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <RiskLevelBadge level={incident.riskLevel} />
                    </td>
                    <td className="px-4 py-4">
                      <IncidentStatusBadge status={incident.status} />
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={getDispatchStatus(incident) === "IN_PROGRESS" ? "amber" : getDispatchStatus(incident) === "RESOLVED" ? "green" : getDispatchStatus(incident) === "CLOSED" ? "slate" : "blue"}>
                        {dispatchStatusLabels[getDispatchStatus(incident)]}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{incident.its.nearestPatrolEta}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dispatch/incidents/${incident.id}`}
                          className="inline-flex h-9 items-center rounded-lg border border-amber-200 px-3 text-xs font-bold text-amber-700 no-underline transition hover:bg-amber-50"
                        >
                          상세
                        </Link>
                        {canAssignDispatcher ? (
                          <button type="button" onClick={() => handleMockAction("담당자 배정", incident.code)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                            배정
                          </button>
                        ) : null}
                        {canChangeStatus ? (
                          <button type="button" onClick={() => handleMockAction("상태 변경", incident.code)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                            상태
                          </button>
                        ) : null}
                        {canViewHistory ? (
                          <button type="button" onClick={() => handleMockAction("처리 이력 확인", incident.code)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                            <History className="h-3.5 w-3.5" aria-hidden="true" />
                            이력
                          </button>
                        ) : null}
                        {canWriteControlMemo ? (
                          <button type="button" onClick={() => handleMockAction("관제자 메모 작성", incident.code)} className="inline-flex h-9 items-center rounded-lg border border-sky-200 px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-50">
                            메모
                          </button>
                        ) : null}
                        {canMessageMaintainer ? (
                          <button type="button" onClick={() => handleMockAction("출동관리자 메시지", incident.code)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-200 px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-50">
                            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                            메시지
                          </button>
                        ) : null}
                        {canUseMaintainerActions ? (
                          <>
                            <Link href="/dispatch/map" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 px-3 text-xs font-bold text-amber-700 no-underline transition hover:bg-amber-50">
                              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                              위치
                            </Link>
                            <button type="button" onClick={() => handleMockAction("출동 시작", incident.code)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-xs font-bold text-white transition hover:bg-amber-700">
                              <Play className="h-3.5 w-3.5" aria-hidden="true" />
                              출동 시작
                            </button>
                            <button type="button" onClick={() => handleMockAction("처리 완료", incident.code)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              완료
                            </button>
                            <button type="button" onClick={() => handleMockAction("관제자 메시지", incident.code)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                              관제 메시지
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dispatchIncidents.length === 0 ? (
            <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">
              조건에 맞는 출동 사건이 없습니다.
            </p>
          ) : null}
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
