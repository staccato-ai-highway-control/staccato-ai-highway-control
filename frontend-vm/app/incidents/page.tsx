"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorPage } from "@/components/common/ErrorPage";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import { getIncidents, updateIncidentStatus } from "@/features/incidents/api";
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

function getIncidentAnalysisJobId(incident: Incident) {
  return incident.analysis_job_id ?? incident.job_id;
}

function matchesSearch(incident: Incident, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;

  return [incident.code, incident.roadName, incident.title, incident.location]
    .join(" ")
    .toLowerCase()
    .includes(normalizedKeyword);
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [typeFilter, setTypeFilter] = useState<IncidentTypeFilter>("ALL");
  const [riskFilter, setRiskFilter] = useState<RiskLevelFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<IncidentStatusFilter>("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadIncidents() {
    setLoading(true);
    setErrorMessage(null);

    try {
      setIncidents(await getIncidents());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "이벤트 목록을 불러오지 못했습니다.");
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  async function handleStatusChange(incident: Incident, status: IncidentStatus) {
    setUpdatingId(incident.id);
    setErrorMessage(null);

    try {
      await updateIncidentStatus(incident.id, status);
      setIncidents((current) => current.map((item) => (item.id === incident.id ? { ...item, status } : item)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "이벤트 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const typeMatched = typeFilter === "ALL" || incident.eventType === typeFilter;
      const riskMatched = riskFilter === "ALL" || incident.riskLevel === riskFilter;
      const statusMatched = statusFilter === "ALL" || incident.status === statusFilter;

      return typeMatched && riskMatched && statusMatched && matchesSearch(incident, searchKeyword);
    });
  }, [incidents, riskFilter, searchKeyword, statusFilter, typeFilter]);

  return (
    <RequireAuth>
      <AppLayout title="이벤트 관리">
        <section className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">이벤트 관리</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">전체 실시간 이벤트 목록과 상태, 담당자, 오탐 처리를 통합 관리합니다.</p>
        </section>

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="이벤트 코드, 도로명, 제목 검색" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white" />
            </div>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as IncidentTypeFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskLevelFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {riskOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IncidentStatusFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </section>

        {errorMessage && !loading && incidents.length === 0 ? (
          <ErrorPage
            statusCode={500}
            title="이벤트 목록을 불러오지 못했습니다"
            description={errorMessage}
            actionLabel="다시 시도"
            actionHref={undefined}
            onAction={loadIncidents}
            secondaryActionLabel="대시보드로 이동"
            secondaryActionHref="/dashboard"
          />
        ) : null}
        {errorMessage && incidents.length > 0 ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        {!(errorMessage && !loading && incidents.length === 0) ? <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-700">{loading ? "불러오는 중" : `${filteredIncidents.length}건`}</span>
            <button type="button" onClick={loadIncidents} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">새로고침</button>
          </div>
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
                    <td className="px-4 py-4 font-bold text-slate-700"><span className="block max-w-[140px] truncate">{incident.code}</span></td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{incidentTypeLabels[incident.eventType]}</td>
                    <td className="px-4 py-4">
                      <b className="block max-w-[260px] truncate text-slate-950">{incident.title}</b>
                      <p className="mt-1 text-xs font-semibold text-slate-400">신뢰도 {Math.round(incident.confidence * 100)}%</p>
                    </td>
                    <td className="px-4 py-4">
                      <b className="block max-w-[220px] truncate text-slate-700">{incident.roadName}</b>
                      <p className="mt-1 max-w-[240px] truncate text-xs font-semibold text-slate-500">{incident.location}</p>
                    </td>
                    <td className="px-4 py-4"><RiskLevelBadge level={incident.riskLevel} /></td>
                    <td className="px-4 py-4"><IncidentStatusBadge status={incident.status} /></td>
                    <td className="px-4 py-4 font-semibold text-slate-500">{incident.detectedAt}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{incident.assignee ?? "미배정"}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/incidents/${incident.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">상세 보기</Link>
                        <button type="button" disabled={updatingId === incident.id} onClick={() => handleStatusChange(incident, "REVIEWING")} className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50">검토중</button>
                        <button type="button" disabled={updatingId === incident.id} onClick={() => handleStatusChange(incident, "FALSE_POSITIVE")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">오탐 처리</button>
                        {getIncidentAnalysisJobId(incident) ? (
                          <Link href={"/reports/analysis-comparisons?selectedJobId=" + encodeURIComponent(String(getIncidentAnalysisJobId(incident)))} className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 no-underline transition hover:bg-sky-50">비교분석</Link>
                        ) : (
                          <button type="button" disabled title="비교 가능한 분석 결과 정보가 없습니다." className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-400 disabled:opacity-60">비교분석</button>
                        )}
                        <button type="button" disabled={updatingId === incident.id} onClick={() => handleStatusChange(incident, "RESOLVED")} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">처리 완료</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredIncidents.length === 0 ? <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">조건에 맞는 이벤트가 없습니다.</p> : null}
        </section> : null}
      </AppLayout>
    </RequireAuth>
  );
}
