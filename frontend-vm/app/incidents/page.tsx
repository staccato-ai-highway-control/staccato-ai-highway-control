"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import { mockIncidents } from "@/features/incidents/mock";
import {
  incidentTypeLabels,
  type Incident,
  type IncidentStatus,
  type IncidentType,
  type RiskLevel,
} from "@/features/incidents/types";

type IncidentTypeFilter = "ALL" | IncidentType;
type RiskLevelFilter = "ALL" | RiskLevel;
type IncidentStatusFilter = "ALL" | IncidentStatus;

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

export default function IncidentsPage() {
  const [typeFilter, setTypeFilter] = useState<IncidentTypeFilter>("ALL");
  const [riskFilter, setRiskFilter] = useState<RiskLevelFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<IncidentStatusFilter>("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  const canManageIncidents = true;

  const filteredIncidents = useMemo(() => {
    return mockIncidents.filter((incident) => {
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
  }, [riskFilter, searchKeyword, statusFilter, typeFilter]);

  const pageDescription = "전체 실시간 이벤트 목록과 상태, 담당자, 오탐 처리를 통합 관리합니다.";

  return (
    <RequireAuth>
      <AppLayout title="이벤트 관리">
        <section className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">이벤트 관리</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {pageDescription}
          </p>
        </section>

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="이벤트 코드, 도로명, 제목 검색"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
              />
            </div>
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
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">incident_code</th>
                  <th className="px-4 py-3">이벤트 유형</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">도로명/위치</th>
                  <th className="px-4 py-3">위험도</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">탐지 시각</th>
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
                        <Link href={`/incidents/${incident.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">
                          상세 보기
                        </Link>
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
                          처리 완료
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredIncidents.length === 0 ? (
            <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">
              조건에 맞는 이벤트가 없습니다.
            </p>
          ) : null}
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
