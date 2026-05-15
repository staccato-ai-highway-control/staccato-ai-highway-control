"use client";

import Link from "next/link";
import { FileText, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { mockIncidents } from "@/features/incidents/mock";
import {
  incidentTypeLabels,
  type Incident,
  type IncidentStatus,
  type IncidentType,
  type RiskLevel,
} from "@/features/incidents/types";
import { getStoredAuthUser } from "@/lib/authStorage";

type IncidentTypeFilter = "ALL" | IncidentType;
type RiskLevelFilter = "ALL" | RiskLevel;
type IncidentStatusFilter = "ALL" | IncidentStatus;
type MaintainerIncidentFilter = "ASSIGNED_TO_ME" | "IN_PROGRESS" | "DONE";

const typeOptions: Array<{ label: string; value: IncidentTypeFilter }> = [
  { label: "전체 유형", value: "ALL" },
  { label: "주행차로 정차", value: "LANE_STOP" },
  { label: "갓길 정차", value: "SHOULDER_STOP" },
];

const riskOptions: Array<{ label: string; value: RiskLevelFilter }> = [
  { label: "전체 위험도", value: "ALL" },
  { label: "낮음", value: "LOW" },
  { label: "보통", value: "MEDIUM" },
  { label: "높음", value: "HIGH" },
  { label: "긴급", value: "CRITICAL" },
];

const statusOptions: Array<{ label: string; value: IncidentStatusFilter }> = [
  { label: "전체 상태", value: "ALL" },
  { label: "탐지됨", value: "DETECTED" },
  { label: "검토중", value: "REVIEWING" },
  { label: "담당 배정", value: "ASSIGNED" },
  { label: "처리완료", value: "RESOLVED" },
  { label: "오탐종료", value: "FALSE_POSITIVE" },
  { label: "종결", value: "CLOSED" },
];

const maintainerFilterOptions: Array<{ label: string; value: MaintainerIncidentFilter }> = [
  { label: "내 배정 사고", value: "ASSIGNED_TO_ME" },
  { label: "처리 중", value: "IN_PROGRESS" },
  { label: "완료", value: "DONE" },
];

function matchesSearch(incident: Incident, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) return true;

  return [incident.code, incident.roadName, incident.title, incident.location]
    .join(" ")
    .toLowerCase()
    .includes(normalizedKeyword);
}

function handleTodoAction(action: string, incidentCode: string) {
  window.alert(`${incidentCode} ${action} 기능은 API 확정 후 연결 예정입니다.`);
}

function getRole(user: AuthUser | null): UserRole | null {
  return user?.role ?? null;
}

function isMaintainerRole(role: UserRole | null) {
  return role === "MAINTAINER" || role === "DISPATCH_ADMIN";
}

function isAssignedToUser(incident: Incident, user: AuthUser | null) {
  const assignee = incident.assignee?.trim();
  if (!assignee || assignee === "미배정") return false;

  const candidates = [user?.name, user?.login_id, user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim());

  return candidates.includes(assignee);
}

function matchesMaintainerFilter(incident: Incident, filter: MaintainerIncidentFilter) {
  if (filter === "ASSIGNED_TO_ME") return true;
  if (filter === "IN_PROGRESS") return ["REVIEWING", "ASSIGNED"].includes(incident.status);
  return ["RESOLVED", "CLOSED"].includes(incident.status);
}

function getIncidentDetailHref(incident: Incident, role: UserRole | null) {
  return isMaintainerRole(role)
    ? `/dispatch/incidents/${incident.id}`
    : `/incidents/${incident.id}`;
}

export default function IncidentsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [typeFilter, setTypeFilter] = useState<IncidentTypeFilter>("ALL");
  const [riskFilter, setRiskFilter] = useState<RiskLevelFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<IncidentStatusFilter>("ALL");
  const [maintainerFilter, setMaintainerFilter] = useState<MaintainerIncidentFilter>("ASSIGNED_TO_ME");
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const role = getRole(authUser);
  const isMaintainer = isMaintainerRole(role);
  const canManageIncidents = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canUseLlmReports = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";

  const filteredIncidents = useMemo(() => {
    return mockIncidents.filter((incident) => {
      if (isMaintainer) {
        return (
          isAssignedToUser(incident, authUser) &&
          matchesMaintainerFilter(incident, maintainerFilter) &&
          matchesSearch(incident, searchKeyword)
        );
      }

      const typeMatched = typeFilter === "ALL" || incident.eventType === typeFilter;
      const riskMatched = riskFilter === "ALL" || incident.riskLevel === riskFilter;
      const statusMatched = statusFilter === "ALL" || incident.status === statusFilter;

      return (
        typeMatched &&
        riskMatched &&
        statusMatched &&
        matchesSearch(incident, searchKeyword)
      );
    });
  }, [authUser, isMaintainer, maintainerFilter, riskFilter, searchKeyword, statusFilter, typeFilter]);

  const pageDescription = isMaintainer
    ? "내게 배정된 사고와 출동 관련 사고를 확인하고 처리 상태를 관리합니다."
    : role === "CONTROL_ADMIN"
      ? "신규 사고, 처리 중 사고, 고위험 사고를 중심으로 이상상황을 관리합니다."
      : "전체 이상상황/사고 목록과 상태, 담당자, 오탐 처리를 관리합니다.";

  return (
    <RequireAuth>
      <AppLayout title="사고 대응 관리">
        <section className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">사고 대응 관리</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {pageDescription}
          </p>
        </section>

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className={isMaintainer ? "grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center" : "grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center"}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="사고 코드, 도로명, 제목 검색"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
              />
            </div>
            {isMaintainer ? (
              <select value={maintainerFilter} onChange={(event) => setMaintainerFilter(event.target.value as MaintainerIncidentFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                {maintainerFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as IncidentTypeFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskLevelFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                  {riskOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IncidentStatusFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">incident_code</th>
                  <th className="px-4 py-3">사고 유형</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">도로명/위치</th>
                  <th className="px-4 py-3">위험도</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">감지 시각</th>
                  <th className="px-4 py-3">담당자</th>
                  <th className="px-4 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4 font-bold text-slate-700">{incident.code}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{incidentTypeLabels[incident.eventType]}</td>
                    <td className="px-4 py-4">
                      <b className="text-slate-950">{incident.title}</b>
                      <p className="mt-1 text-xs font-semibold text-slate-400">AI 신뢰도 {Math.round(incident.confidence * 100)}%</p>
                    </td>
                    <td className="px-4 py-4">
                      <b className="text-slate-700">{incident.roadName}</b>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{incident.location}</p>
                    </td>
                    <td className="px-4 py-4">
                      <RiskLevelBadge level={incident.riskLevel} />
                    </td>
                    <td className="px-4 py-4">
                      <IncidentStatusBadge status={incident.status} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-500">{incident.detectedAt}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{incident.assignee ?? "미배정"}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={getIncidentDetailHref(incident, role)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">
                          상세 보기
                        </Link>
                        {isMaintainer ? (
                          <Link href="/dispatch/map" className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 no-underline transition hover:bg-amber-50">
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            위치 확인
                          </Link>
                        ) : null}
                        {canManageIncidents ? (
                          <>
                            <button type="button" onClick={() => handleTodoAction("담당자 배정", incident.code)} className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50">
                              담당자 배정
                            </button>
                            <button type="button" onClick={() => handleTodoAction("오탐 처리", incident.code)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                              오탐 처리
                            </button>
                          </>
                        ) : null}
                        <button type="button" onClick={() => handleTodoAction("처리 완료", incident.code)} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50">
                          {isMaintainer ? "처리 상태 변경" : "처리 완료"}
                        </button>
                        {canUseLlmReports ? (
                          <Link href="/llm-reports" className="inline-flex items-center gap-1 rounded-lg border border-purple-200 px-3 py-2 text-xs font-bold text-purple-700 no-underline transition hover:bg-purple-50">
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            LLM 보고서
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredIncidents.length === 0 ? (
            <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">
              조건에 맞는 사고 이벤트가 없습니다.
            </p>
          ) : null}
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
