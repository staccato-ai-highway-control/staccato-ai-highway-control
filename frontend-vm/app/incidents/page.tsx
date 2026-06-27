"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const incidentStatusOptions = statusOptions.filter(
  (option): option is { label: string; value: IncidentStatus } => option.value !== "ALL"
);

const pageSizeOptions = [10, 20, 50];

function getIncidentAnalysisJobId(incident: Incident) {
  return incident.analysis_job_id ?? incident.job_id;
}

function formatDetectedAt(detectedAt: string) {
  return detectedAt.replace("T", " ");
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
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<IncidentStatus>("REVIEWING");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [selectedIncidentIds, setSelectedIncidentIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

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

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));
  const visibleCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = filteredIncidents.length === 0 ? 0 : (visibleCurrentPage - 1) * pageSize + 1;
  const pageEndIndex = Math.min(visibleCurrentPage * pageSize, filteredIncidents.length);
  const paginatedIncidents = useMemo(
    () => filteredIncidents.slice((visibleCurrentPage - 1) * pageSize, visibleCurrentPage * pageSize),
    [filteredIncidents, pageSize, visibleCurrentPage]
  );
  const visibleIncidentIds = useMemo(() => paginatedIncidents.map((incident) => incident.id), [paginatedIncidents]);
  const allVisibleSelected = visibleIncidentIds.length > 0 && visibleIncidentIds.every((id) => selectedIncidentIds.has(id));
  const someVisibleSelected = visibleIncidentIds.some((id) => selectedIncidentIds.has(id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  useEffect(() => {
    setSelectedIncidentIds((current) => {
      const visibleIds = new Set(visibleIncidentIds);
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleIncidentIds]);

  function toggleAllIncidents(checked: boolean) {
    setSelectedIncidentIds(checked ? new Set(visibleIncidentIds) : new Set());
  }

  function toggleIncident(incidentId: string, checked: boolean) {
    setSelectedIncidentIds((current) => {
      const next = new Set(current);
      if (checked) next.add(incidentId);
      else next.delete(incidentId);
      return next;
    });
  }

  const selectedIncidents = useMemo(
    () => paginatedIncidents.filter((incident) => selectedIncidentIds.has(incident.id)),
    [paginatedIncidents, selectedIncidentIds]
  );

  async function handleBulkStatusChange() {
    if (selectedIncidents.length === 0) return;
    setBulkUpdating(true);
    setErrorMessage(null);

    const results = await Promise.allSettled(
      selectedIncidents.map((incident) => updateIncidentStatus(incident.id, bulkStatus))
    );
    const succeededIds = new Set(
      selectedIncidents
        .filter((_, index) => results[index]?.status === "fulfilled")
        .map((incident) => incident.id)
    );

    setIncidents((current) => current.map((incident) => (
      succeededIds.has(incident.id) ? { ...incident, status: bulkStatus } : incident
    )));
    setSelectedIncidentIds(new Set());
    setBulkUpdating(false);

    const failedCount = results.length - succeededIds.size;
    if (failedCount > 0) {
      setErrorMessage(`${failedCount}건의 이벤트 상태를 변경하지 못했습니다.`);
    }
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, riskFilter, searchKeyword, statusFilter, typeFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-700">{loading ? "불러오는 중" : `전체 ${filteredIncidents.length}건 · 현재 ${pageStartIndex}-${pageEndIndex}건 · ${selectedIncidentIds.size}건 선택`}</span>
            <button type="button" onClick={loadIncidents} className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">새로고침</button>
          </div>
          {selectedIncidentIds.size > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-sky-50/70 px-4 py-3">
              <span className="text-sm font-black text-sky-800">{selectedIncidentIds.size}건 선택됨</span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value as IncidentStatus)}
                  disabled={bulkUpdating}
                  aria-label="선택 이벤트 변경 상태"
                  className="h-9 rounded-lg border border-sky-200 bg-white px-3 text-xs font-bold text-sky-800 disabled:opacity-50"
                >
                  {incidentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" onClick={handleBulkStatusChange} disabled={bulkUpdating} className="h-9 rounded-lg bg-sky-700 px-3 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-50">
                  {bulkUpdating ? "변경 중" : "선택 상태 변경"}
                </button>
              </div>
            </div>
          ) : null}
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-11 px-2 py-3 text-center"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllIncidents(event.target.checked)} aria-label="현재 이벤트 전체 선택" className="h-4 w-4 rounded border-slate-300" /></th>
                  <th className="w-[9%] px-2 py-3">코드</th>
                  <th className="w-[9%] px-2 py-3">유형</th>
                  <th className="w-[12%] px-2 py-3">제목</th>
                  <th className="w-[13%] px-2 py-3">도로명/위치</th>
                  <th className="w-[6%] px-2 py-3">위험도</th>
                  <th className="w-[7%] px-2 py-3">상태</th>
                  <th className="w-[11%] px-2 py-3">탐지 시각</th>
                  <th className="w-[9%] px-2 py-3">담당자</th>
                  <th className="w-[220px] px-2 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {paginatedIncidents.map((incident) => {
                  const roadName = incident.roadName.trim();
                  const location = incident.location.trim();

                  return (
                    <tr key={incident.id} className="border-t border-slate-100 align-top">
                      <td className="px-2 py-4 text-center"><input type="checkbox" checked={selectedIncidentIds.has(incident.id)} onChange={(event) => toggleIncident(incident.id, event.target.checked)} aria-label={incident.title + " 선택"} className="h-4 w-4 rounded border-slate-300" /></td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-bold text-slate-700" title={incident.code}>{incident.code}</td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-600" title={incidentTypeLabels[incident.eventType]}>{incidentTypeLabels[incident.eventType]}</td>
                      <td className="min-w-0 px-2 py-4">
                        <b className="block truncate text-slate-950" title={incident.title}>{incident.title}</b>
                        <p className="mt-1 text-xs font-semibold text-slate-400">신뢰도 {Math.round(incident.confidence * 100)}%</p>
                      </td>
                      <td className="min-w-0 px-2 py-4">
                        {roadName || location ? (
                          <>
                            <b className="block truncate text-slate-700" title={roadName}>{roadName || "-"}</b>
                            {location ? <p className="mt-1 truncate text-xs font-semibold text-slate-500" title={location}>{location}</p> : null}
                          </>
                        ) : (
                          <span className="font-semibold text-slate-500">-</span>
                        )}
                      </td>
                      <td className="truncate whitespace-nowrap px-2 py-4"><RiskLevelBadge level={incident.riskLevel} /></td>
                      <td className="truncate whitespace-nowrap px-2 py-4"><IncidentStatusBadge status={incident.status} /></td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-500" title={formatDetectedAt(incident.detectedAt)}>{formatDetectedAt(incident.detectedAt)}</td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-600" title={incident.assignee?.trim() || "미배정"}>{incident.assignee?.trim() || "미배정"}</td>
                      <td className="px-2 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Link href={`/incidents/${incident.id}`} className="whitespace-nowrap rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">상세 보기</Link>
                          <select
                            value={incident.status}
                            disabled={updatingId === incident.id}
                            onChange={(event) => handleStatusChange(incident, event.target.value as IncidentStatus)}
                            aria-label={`${incident.title} 상태 변경`}
                            className="h-8 min-w-24 rounded-lg border border-sky-200 bg-white px-2 text-xs font-bold text-sky-700 outline-none transition focus:border-sky-400 disabled:cursor-wait disabled:opacity-50"
                          >
                            {incidentStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && filteredIncidents.length === 0 ? <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">조건에 맞는 이벤트가 없습니다.</p> : null}

          {!loading && filteredIncidents.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <span className="text-sm font-bold text-slate-600">전체 {filteredIncidents.length}건 · 현재 {pageStartIndex}-{pageEndIndex}건 표시</span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
                  aria-label="페이지당 표시 건수"
                >
                  {pageSizeOptions.map((option) => <option key={option} value={option}>{option}건</option>)}
                </select>
                <button
                  type="button"
                  disabled={visibleCurrentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전
                </button>
                <span className="min-w-[76px] text-center text-xs font-bold text-slate-500">{visibleCurrentPage} / {totalPages}</span>
                <button
                  type="button"
                  disabled={visibleCurrentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          ) : null}
        </section> : null}
      </AppLayout>
    </RequireAuth>
  );
}
