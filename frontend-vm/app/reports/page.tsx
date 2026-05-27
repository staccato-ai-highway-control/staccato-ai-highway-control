"use client";

import Link from "next/link";
import { Search, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorPage } from "@/components/common/ErrorPage";
import { Badge } from "@/components/common/Badge";
import { getReports, requestReportAnalysis } from "@/features/reports/api";
import type { Report, ReportPriority, ReportProcessingStatus, ReportType } from "@/features/reports/types";

type StatusFilter = "ALL" | ReportProcessingStatus;
type TypeFilter = "ALL" | ReportType;
type PriorityFilter = "ALL" | ReportPriority;

const statusLabels: Record<ReportProcessingStatus, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토중",
  ANALYZING: "AI 분석중",
  CONVERTED_TO_INCIDENT: "이벤트 전환",
  REJECTED: "반려",
};

const typeLabels: Record<ReportType, string> = {
  GENERAL: "일반",
  ACCIDENT: "이벤트",
  LANE_STOP_REPORT: "주행차로 정차",
  SHOULDER_STOP_REPORT: "갓길 정차",
  UNKNOWN_REPORT: "유형 미확인",
};

const priorityLabels: Record<ReportPriority, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  MEDIUM: "중간",
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
  NORMAL: "blue",
  MEDIUM: "blue",
  HIGH: "amber",
  URGENT: "red",
};

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "전체 상태", value: "ALL" },
  { label: "접수", value: "SUBMITTED" },
  { label: "검토중", value: "REVIEWING" },
  { label: "AI 분석중", value: "ANALYZING" },
  { label: "이벤트 전환", value: "CONVERTED_TO_INCIDENT" },
  { label: "반려", value: "REJECTED" },
];

const typeOptions: Array<{ label: string; value: TypeFilter }> = [
  { label: "전체 유형", value: "ALL" },
  { label: "일반", value: "GENERAL" },
  { label: "이벤트", value: "ACCIDENT" },
  { label: "주행차로 정차", value: "LANE_STOP_REPORT" },
  { label: "갓길 정차", value: "SHOULDER_STOP_REPORT" },
  { label: "유형 미확인", value: "UNKNOWN_REPORT" },
];

const priorityOptions: Array<{ label: string; value: PriorityFilter }> = [
  { label: "전체 우선순위", value: "ALL" },
  { label: "낮음", value: "LOW" },
  { label: "보통", value: "NORMAL" },
  { label: "중간", value: "MEDIUM" },
  { label: "높음", value: "HIGH" },
  { label: "긴급", value: "URGENT" },
];

function matchesSearch(report: Report, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;

  return [report.title, report.location, report.reporter, report.reportCode]
    .join(" ")
    .toLowerCase()
    .includes(normalizedKeyword);
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  async function loadReports() {
    setLoading(true);
    setErrorMessage(null);

    try {
      setReports(await getReports());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "신고 목록을 불러오지 못했습니다.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function handleRequestAnalysis(report: Report) {
    setAnalyzingId(report.id);
    setErrorMessage(null);

    try {
      await requestReportAnalysis(report.id);
      setReports((current) => current.map((item) => (item.id === report.id ? { ...item, status: "ANALYZING", analysisStatus: "REQUESTED" } : item)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 분석 요청에 실패했습니다.");
    } finally {
      setAnalyzingId(null);
    }
  }

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const statusMatched = statusFilter === "ALL" || report.status === statusFilter;
      const typeMatched = typeFilter === "ALL" || report.reportType === typeFilter;
      const priorityMatched = priorityFilter === "ALL" || report.priority === priorityFilter;
      return statusMatched && typeMatched && priorityMatched && matchesSearch(report, searchKeyword);
    });
  }, [priorityFilter, reports, searchKeyword, statusFilter, typeFilter]);

  return (
    <RequireAuth>
      <AppLayout title="신고 목록">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">신고 목록</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">전체 신고 목록과 분석 요청, 이벤트 전환 결과, 검토 상태를 통합 관리합니다.</p>
          </div>
          <Link href="/reports/create" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white no-underline transition hover:bg-staccato-dark">
            <Upload className="h-4 w-4" aria-hidden="true" />
            신고 등록
          </Link>
        </section>

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="제목, 위치, 등록자 검색" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white" />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </section>

        {errorMessage && !loading && reports.length === 0 ? (
          <ErrorPage
            statusCode={500}
            title="신고 목록을 불러오지 못했습니다"
            description={errorMessage}
            actionLabel="다시 시도"
            actionHref={undefined}
            onAction={loadReports}
            secondaryActionLabel="대시보드로 이동"
            secondaryActionHref="/dashboard"
          />
        ) : null}
        {errorMessage && reports.length > 0 ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        {!(errorMessage && !loading && reports.length === 0) ? <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-700">{loading ? "불러오는 중" : `${filteredReports.length}건`}</span>
            <button type="button" onClick={loadReports} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">새로고침</button>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[1180px] text-sm">
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
                    <td className="px-4 py-4"><Badge tone={statusTone[report.status]}>{statusLabels[report.status]}</Badge></td>
                    <td className="px-4 py-4"><Badge tone={priorityTone[report.priority]}>{priorityLabels[report.priority]}</Badge></td>
                    <td className="px-4 py-4 font-semibold text-slate-500">{report.createdAt}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/reports/${report.id}`} className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">상세</Link>
                        <button type="button" onClick={() => handleRequestAnalysis(report)} disabled={analyzingId === report.id} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                          분석
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredReports.length === 0 ? <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">조건에 맞는 신고 등록 내역이 없습니다.</p> : null}
        </section> : null}
      </AppLayout>
    </RequireAuth>
  );
}
