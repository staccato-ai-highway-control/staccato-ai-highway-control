"use client";

import Link from "next/link";
import { FileCheck2, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { mockIncidents } from "@/features/incidents/mock";
import type { Incident } from "@/features/incidents/types";
import { mockReports } from "@/features/reports/mock";
import type {
  Report,
  ReportPriority,
  ReportProcessingStatus,
  ReportType,
} from "@/features/reports/types";
import { getStoredAuthUser } from "@/lib/authStorage";

type StatusFilter = "ALL" | ReportProcessingStatus;
type TypeFilter = "ALL" | ReportType;
type PriorityFilter = "ALL" | ReportPriority;

const statusLabels: Record<ReportProcessingStatus, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토중",
  ANALYZING: "AI 분석중",
  CONVERTED_TO_INCIDENT: "사고 전환",
  REJECTED: "반려",
};

const typeLabels: Record<ReportType, string> = {
  LANE_STOP_REPORT: "주행차로 정차",
  SHOULDER_STOP_REPORT: "갓길 정차",
  UNKNOWN_REPORT: "유형 미확인",
};

const priorityLabels: Record<ReportPriority, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  URGENT: "긴급",
};

const statusTone: Record<ReportProcessingStatus, "slate" | "blue" | "green" | "amber" | "red"> = {
  SUBMITTED: "slate",
  REVIEWING: "blue",
  ANALYZING: "amber",
  CONVERTED_TO_INCIDENT: "green",
  REJECTED: "red",
};

const priorityTone: Record<ReportPriority, "slate" | "blue" | "green" | "amber" | "red"> = {
  LOW: "slate",
  MEDIUM: "blue",
  HIGH: "amber",
  URGENT: "red",
};

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "전체 상태", value: "ALL" },
  { label: "접수", value: "SUBMITTED" },
  { label: "검토중", value: "REVIEWING" },
  { label: "AI 분석중", value: "ANALYZING" },
  { label: "사고 전환", value: "CONVERTED_TO_INCIDENT" },
  { label: "반려", value: "REJECTED" },
];

const typeOptions: Array<{ label: string; value: TypeFilter }> = [
  { label: "전체 유형", value: "ALL" },
  { label: "주행차로 정차", value: "LANE_STOP_REPORT" },
  { label: "갓길 정차", value: "SHOULDER_STOP_REPORT" },
  { label: "유형 미확인", value: "UNKNOWN_REPORT" },
];

const priorityOptions: Array<{ label: string; value: PriorityFilter }> = [
  { label: "전체 우선순위", value: "ALL" },
  { label: "낮음", value: "LOW" },
  { label: "보통", value: "MEDIUM" },
  { label: "높음", value: "HIGH" },
  { label: "긴급", value: "URGENT" },
];

function matchesSearch(report: Report, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) return true;

  return [report.title, report.location, report.reporter]
    .join(" ")
    .toLowerCase()
    .includes(normalizedKeyword);
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

function isReportConnectedToIncident(report: Report, incident: Incident) {
  return (
    report.convertedIncidentCode === incident.code ||
    report.cctvId === incident.cctvId ||
    report.location.includes(incident.roadName)
  );
}

export default function ReportsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const role = getRole(authUser);
  const isMaintainer = isMaintainerRole(role);
  const canRegisterReport = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canRequestAnalysis = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canChangeStatus = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canDeleteReport = role === "SUPER_ADMIN";
  const canControlReview = role === "CONTROL_ADMIN";

  const visibleReports = useMemo(() => {
    if (!isMaintainer) return reports;

    const assignedIncidents = mockIncidents.filter((incident) =>
      isAssignedToUser(incident, authUser)
    );

    return reports.filter((report) =>
      assignedIncidents.some((incident) => isReportConnectedToIncident(report, incident))
    );
  }, [authUser, isMaintainer, reports]);

  const filteredReports = useMemo(() => {
    return visibleReports.filter((report) => {
      const statusMatched = statusFilter === "ALL" || report.status === statusFilter;
      const typeMatched = typeFilter === "ALL" || report.reportType === typeFilter;
      const priorityMatched = priorityFilter === "ALL" || report.priority === priorityFilter;

      return (
        statusMatched &&
        typeMatched &&
        priorityMatched &&
        matchesSearch(report, searchKeyword)
      );
    });
  }, [priorityFilter, searchKeyword, statusFilter, typeFilter, visibleReports]);

  const pageDescription = isMaintainer
    ? "내 배정 사고와 연결된 신고만 조회합니다. 등록, 분석 요청, 상태 변경은 제한됩니다."
    : role === "CONTROL_ADMIN"
      ? "신고 등록, AI 분석 요청, 사고 전환 결과와 검토 상태를 관리합니다."
      : "전체 신고 목록과 AI 분석, 사고 전환, 삭제/관리 액션을 처리합니다.";

  function handleMockAction(action: string, reportCode: string) {
    window.alert(`${reportCode} ${action} 기능은 API 확정 후 연결 예정입니다.`);
  }

  function handleMockDelete(report: Report) {
    const confirmed = window.confirm(`${report.reportCode} 신고를 목록에서 삭제하시겠습니까?`);
    if (!confirmed) return;

    setReports((current) => current.filter((item) => item.id !== report.id));
  }

  return (
    <RequireAuth>
      <AppLayout title="이상상황 등록/처리">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">이상상황 등록/처리</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {pageDescription}
            </p>
          </div>
          {canRegisterReport ? (
            <Link
              href="/reports/create"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white no-underline transition hover:bg-staccato-dark"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              이상상황 등록
            </Link>
          ) : null}
        </section>

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="제목, 위치, 등록자 검색"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
              />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            {isMaintainer
              ? "출동관리자는 배정 사고와 연결된 신고를 조회만 할 수 있습니다."
              : "상단의 이상상황 등록 버튼에서 영상/이미지를 업로드하고 AI 분석 상태를 확인합니다."}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">report_code</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">유형</th>
                  <th className="px-4 py-3">등록자</th>
                  <th className="px-4 py-3">위치</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">우선순위</th>
                  <th className="px-4 py-3">등록일</th>
                  <th className="px-4 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className="border-t border-slate-100">
                    <td className="px-4 py-4 font-bold text-slate-700">{report.reportCode}</td>
                    <td className="px-4 py-4">
                      <b className="text-slate-950">{report.title}</b>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{report.attachmentName}</p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{typeLabels[report.reportType]}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{report.reporter}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{report.location}</td>
                    <td className="px-4 py-4">
                      <Badge tone={statusTone[report.status]}>{statusLabels[report.status]}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={priorityTone[report.priority]}>{priorityLabels[report.priority]}</Badge>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-500">{report.createdAt}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/reports/${report.id}`} className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">
                          상세
                        </Link>
                        {canRequestAnalysis ? (
                          <button type="button" onClick={() => handleMockAction("AI 분석 요청", report.reportCode)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800">
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            분석
                          </button>
                        ) : null}
                        {canChangeStatus ? (
                          <button type="button" onClick={() => handleMockAction("상태 변경", report.reportCode)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                            <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                            상태
                          </button>
                        ) : null}
                        {canControlReview ? (
                          <button type="button" onClick={() => handleMockAction("오탐/검토 완료 처리", report.reportCode)} className="inline-flex h-9 items-center rounded-lg border border-sky-200 px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-50">
                            검토완료
                          </button>
                        ) : null}
                        {canDeleteReport ? (
                          <button type="button" onClick={() => handleMockDelete(report)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 transition hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            삭제
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredReports.length === 0 ? (
            <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">
              조건에 맞는 이상상황 등록 내역이 없습니다.
            </p>
          ) : null}
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
