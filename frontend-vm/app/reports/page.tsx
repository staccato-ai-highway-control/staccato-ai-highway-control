"use client";

import Link from "next/link";
import { Search, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorPage } from "@/components/common/ErrorPage";
import { Badge } from "@/components/common/Badge";
import { getMyReports, getReports, requestReportAnalysis, updateReportStatus } from "@/features/reports/api";
import type { AuthUser } from "@/features/auth/types";
import type { PaginatedReports, Report, ReportListParams } from "@/features/reports/types";
import { getStoredAuthUser } from "@/lib/authStorage";

type ReportFilter = {
  keyword: string;
  status: string;
  report_type: string;
  priority: string;
  page: number;
  size: number;
  mine: boolean;
};

const reportStatusOptions = [
  { label: "접수", value: "SUBMITTED" },
  { label: "검토중", value: "REVIEWING" },
  { label: "분석중", value: "ANALYZING" },
  { label: "이벤트 전환", value: "CONVERTED_TO_INCIDENT" },
  { label: "반려", value: "REJECTED" },
  { label: "종결", value: "CLOSED" },
];

const statusOptions = [
  { label: "전체 상태", value: "" },
  { label: "접수", value: "SUBMITTED" },
  { label: "검토중", value: "REVIEWING" },
  { label: "분석중", value: "ANALYZING" },
  { label: "이벤트 전환", value: "CONVERTED_TO_INCIDENT" },
  { label: "반려", value: "REJECTED" },
];

const typeOptions = [
  { label: "전체 유형", value: "" },
  { label: "일반", value: "GENERAL" },
  { label: "이벤트", value: "ACCIDENT" },
  { label: "주행차로 정차", value: "LANE_STOP_REPORT" },
  { label: "갓길 정차", value: "SHOULDER_STOP_REPORT" },
  { label: "유형 미확인", value: "UNKNOWN_REPORT" },
];

const priorityOptions = [
  { label: "전체 우선순위", value: "" },
  { label: "낮음", value: "LOW" },
  { label: "보통", value: "NORMAL" },
  { label: "중간", value: "MEDIUM" },
  { label: "높음", value: "HIGH" },
  { label: "긴급", value: "URGENT" },
];

const statusLabels: Record<string, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토중",
  ANALYZING: "분석중",
  CONVERTED_TO_INCIDENT: "이벤트 전환",
  REJECTED: "반려",
  DELETED: "삭제됨",
};

const typeLabels: Record<string, string> = {
  GENERAL: "일반",
  ACCIDENT: "이벤트",
  LANE_STOP_REPORT: "주행차로 정차",
  SHOULDER_STOP_REPORT: "갓길 정차",
  UNKNOWN_REPORT: "유형 미확인",
};

const priorityLabels: Record<string, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  MEDIUM: "중간",
  HIGH: "높음",
  URGENT: "긴급",
};

function getReportId(report: Report) {
  return String(report.id);
}

function getReportCode(report: Report) {
  return report.report_code ?? report.reportCode ?? `#${report.id}`;
}

function getReportTitle(report: Report) {
  return report.title ?? report.subject ?? "제목 없음";
}

function getReportType(report: Report) {
  return report.report_type ?? report.reportType ?? "GENERAL";
}

function getReportStatus(report: Report) {
  return report.status ?? "SUBMITTED";
}

function getReportPriority(report: Report) {
  return report.priority ?? "NORMAL";
}

function getReportCreatedAt(report: Report) {
  return report.submitted_at ?? report.created_at ?? report.createdAt ?? "-";
}

function getReportLocation(report: Report) {
  return report.location ?? report.address ?? report.place_name ?? report.locationName ?? "-";
}

type ReportWithAnalysisAliases = Report & {
  latestJob?: Report["latest_job"];
  latestAnalysisJob?: Report["latest_job"];
  latest_analysis_job?: Report["latest_job"];
  ai_analysis_status?: string | null;
  detection_count?: number | string | null;
  detected_count?: number | string | null;
  processed_frames?: number | string | null;
  processed_frame_count?: number | string | null;
};

type AnalysisJobWithMetrics = NonNullable<Report["latest_job"]> & {
  detection_count?: number | string | null;
  detected_count?: number | string | null;
  processed_frames?: number | string | null;
  processed_frame_count?: number | string | null;
};

const analysisStatusLabels: Record<string, string> = {
  WAITING: "대기",
  REQUESTED: "요청됨",
  QUEUED: "대기열",
  RUNNING: "실행중",
  PROCESSING: "처리중",
  ANALYZING: "분석중",
  COMPLETED: "완료",
  FAILED: "실패",
  CANCELLED: "취소됨",
};

function getLatestAnalysisJob(report: Report): AnalysisJobWithMetrics | null {
  const current = report as ReportWithAnalysisAliases;
  const jobs = current.analysis_jobs ?? current.analysisJobs ?? [];

  return (
    (current.latest_job as AnalysisJobWithMetrics | null | undefined) ??
    (current.latestJob as AnalysisJobWithMetrics | null | undefined) ??
    (current.latestAnalysisJob as AnalysisJobWithMetrics | null | undefined) ??
    (current.latest_analysis_job as AnalysisJobWithMetrics | null | undefined) ??
    (jobs[0] as AnalysisJobWithMetrics | undefined) ??
    null
  );
}

function getReportAnalysisStatus(report: Report) {
  const current = report as ReportWithAnalysisAliases;
  const latestJob = getLatestAnalysisJob(report);

  return (
    current.analysis_status ??
    current.analysisStatus ??
    current.ai_analysis_status ??
    latestJob?.job_status ??
    latestJob?.status ??
    null
  );
}

function normalizeCount(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function getReportDetectionCount(report: Report) {
  const current = report as ReportWithAnalysisAliases;
  const latestJob = getLatestAnalysisJob(report);

  return normalizeCount(
    current.detection_count ??
    current.detected_count ??
    latestJob?.detection_count ??
    latestJob?.detected_count
  );
}

function getReportProcessedFrames(report: Report) {
  const current = report as ReportWithAnalysisAliases;
  const latestJob = getLatestAnalysisJob(report);

  return normalizeCount(
    current.processed_frames ??
    current.processed_frame_count ??
    latestJob?.processed_frames ??
    latestJob?.processed_frame_count
  );
}

function getReportRiskText(report: Report) {
  const latestJob = getLatestAnalysisJob(report);
  const riskLevel = report.risk_level ?? latestJob?.risk_level ?? null;
  const riskScore = report.risk_score ?? latestJob?.risk_score ?? null;

  if (riskLevel && riskScore !== null && riskScore !== undefined) return `${riskLevel} (${riskScore})`;
  if (riskLevel) return riskLevel;
  if (riskScore !== null && riskScore !== undefined) return String(riskScore);
  return "-";
}

function getBadgeTone(value: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (["REJECTED", "DELETED", "URGENT", "HIGH", "CRITICAL"].includes(value)) return "red";
  if (["ANALYZING", "MEDIUM"].includes(value)) return "amber";
  if (["CONVERTED_TO_INCIDENT", "COMPLETED", "LOW"].includes(value)) return "green";
  if (["REVIEWING", "REQUESTED", "NORMAL"].includes(value)) return "blue";
  return "slate";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function toParams(filter: ReportFilter): ReportListParams {
  return {
    keyword: filter.keyword.trim() || undefined,
    status: filter.status || undefined,
    report_type: filter.report_type || undefined,
    priority: filter.priority || undefined,
    page: filter.page,
    size: filter.size,
  };
}

export default function ReportsPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [filter, setFilter] = useState<ReportFilter>({ keyword: "", status: "", report_type: "", priority: "", page: 1, size: 10, mine: false });
  const [draftKeyword, setDraftKeyword] = useState("");
  const [result, setResult] = useState<PaginatedReports>({ items: [], page: 1, size: 10, total_count: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState("REVIEWING");
  const [bulkAction, setBulkAction] = useState<"status" | "analysis" | null>(null);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  async function loadReports(nextFilter = filter) {
    setLoading(true);
    setErrorMessage(null);

    try {
      const params = toParams(nextFilter);
      const nextResult = nextFilter.mine ? await getMyReports(params) : await getReports({ ...params, mine: nextFilter.mine || undefined });
      setResult(nextResult);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "신고 목록을 불러오지 못했습니다.");
      setResult((current) => ({ ...current, items: [] }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
    loadReports();
  }, [filter.keyword, filter.status, filter.report_type, filter.priority, filter.page, filter.size, filter.mine]);

  function updateFilter(patch: Partial<ReportFilter>) {
    setFilter((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  function handleSearch() {
    setFilter((current) => ({ ...current, keyword: draftKeyword, page: 1 }));
  }

  async function handleRequestAnalysis(report: Report) {
    const reportId = getReportId(report);
    setAnalyzingId(reportId);
    setErrorMessage(null);

    try {
      await requestReportAnalysis(reportId);
      await loadReports();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 분석 요청에 실패했습니다.");
    } finally {
      setAnalyzingId(null);
    }
  }

  const canOperateReports = authUser?.account_status?.toUpperCase() === "ACTIVE" && ["SUPER_ADMIN", "CONTROL_ADMIN"].includes(authUser.role ?? "");
  const reports = useMemo(() => result.items.filter((report) => getReportStatus(report) !== "DELETED"), [result.items]);
  const canPrev = result.page > 1;
  const canNext = result.total_pages > 0 && result.page < result.total_pages;
  const visibleReportIds = useMemo(() => reports.map(getReportId), [reports]);
  const allVisibleSelected = visibleReportIds.length > 0 && visibleReportIds.every((id) => selectedReportIds.has(id));
  const someVisibleSelected = visibleReportIds.some((id) => selectedReportIds.has(id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  useEffect(() => {
    setSelectedReportIds((current) => {
      const visibleIds = new Set(visibleReportIds);
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleReportIds]);

  function toggleAllReports(checked: boolean) {
    setSelectedReportIds(checked ? new Set(visibleReportIds) : new Set());
  }

  function toggleReport(reportId: string, checked: boolean) {
    setSelectedReportIds((current) => {
      const next = new Set(current);
      if (checked) next.add(reportId);
      else next.delete(reportId);
      return next;
    });
  }

  const selectedReports = useMemo(
    () => reports.filter((report) => selectedReportIds.has(getReportId(report))),
    [reports, selectedReportIds]
  );
  const selectedCompletedJobIds = useMemo(
    () => selectedReports
      .map((report) => {
        const job = getLatestAnalysisJob(report);
        const status = job?.job_status ?? job?.status;
        const jobId = job?.analysis_job_id ?? job?.id;
        return status === "COMPLETED" && jobId !== null && jobId !== undefined ? String(jobId) : null;
      })
      .filter((jobId): jobId is string => Boolean(jobId)),
    [selectedReports]
  );
  const canCompareSelected = selectedCompletedJobIds.length >= 2 && selectedCompletedJobIds.length <= 5;

  async function handleBulkStatusChange() {
    if (!canOperateReports || selectedReports.length === 0) return;
    setBulkAction("status");
    setErrorMessage(null);

    const results = await Promise.allSettled(selectedReports.map((report) => (
      updateReportStatus(getReportId(report), {
        status: bulkStatus,
        reason: `목록에서 ${bulkStatus} 상태로 일괄 변경`,
      })
    )));
    const succeededIds = new Set(
      selectedReports
        .filter((_, index) => results[index]?.status === "fulfilled")
        .map(getReportId)
    );

    setResult((current) => ({
      ...current,
      items: current.items.map((report) => (
        succeededIds.has(getReportId(report)) ? { ...report, status: bulkStatus } : report
      )),
    }));
    setSelectedReportIds(new Set());
    setBulkAction(null);

    const failedCount = results.length - succeededIds.size;
    if (failedCount > 0) setErrorMessage(`${failedCount}건의 신고 상태를 변경하지 못했습니다.`);
  }

  async function handleBulkAnalysis() {
    if (!canOperateReports || selectedReports.length === 0) return;
    setBulkAction("analysis");
    setErrorMessage(null);

    const results = await Promise.allSettled(
      selectedReports.map((report) => requestReportAnalysis(getReportId(report)))
    );
    setBulkAction(null);
    setSelectedReportIds(new Set());
    await loadReports();

    const failedCount = results.filter((result) => result.status === "rejected").length;
    if (failedCount > 0) setErrorMessage(`${failedCount}건의 신고 분석을 요청하지 못했습니다.`);
  }

  function handleCompareSelected() {
    if (!canCompareSelected) return;
    const query = new URLSearchParams({
      selectedJobIds: selectedCompletedJobIds.join(","),
      selectedJobId: selectedCompletedJobIds[0],
    });
    router.push(`/reports/analysis-comparisons?${query.toString()}`);
  }

  return (
    <RequireAuth>
      <AppLayout title="신고 목록">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">신고 목록</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">신고 목록과 분석 요청 상태를 조회합니다.</p>
          </div>
          <Link href="/reports/create" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white no-underline transition hover:bg-staccato-dark">
            <Upload className="h-4 w-4" aria-hidden="true" />
            신고 등록
          </Link>
        </section>

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto_auto] xl:items-center">
            <div className="relative flex gap-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={draftKeyword}
                onChange={(event) => setDraftKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch();
                }}
                placeholder="제목, 위치, 코드 검색"
                className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
              />
              <button type="button" onClick={handleSearch} className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">검색</button>
            </div>
            <select value={filter.status} onChange={(event) => updateFilter({ status: event.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={filter.report_type} onChange={(event) => updateFilter({ report_type: event.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={filter.priority} onChange={(event) => updateFilter({ priority: event.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={filter.mine} onChange={(event) => updateFilter({ mine: event.target.checked })} className="h-4 w-4" />
              내 신고만
            </label>
          </div>
        </section>

        {errorMessage && !loading && result.items.length === 0 ? (
          <ErrorPage statusCode={500} title="신고 목록을 불러오지 못했습니다" description={errorMessage} actionLabel="다시 시도" actionHref={undefined} onAction={() => loadReports()} secondaryActionLabel="대시보드로 이동" secondaryActionHref="/dashboard" />
        ) : null}
        {errorMessage && result.items.length > 0 ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        {!(errorMessage && !loading && result.items.length === 0) ? <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-700">{loading ? "불러오는 중" : `${result.total_count || reports.length}건 · ${selectedReportIds.size}건 선택`}</span>
            <div className="flex items-center gap-2">
              <select value={filter.size} onChange={(event) => updateFilter({ size: Number(event.target.value) })} className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700">
                {[10, 20, 50].map((size) => <option key={size} value={size}>{size}개</option>)}
              </select>
              <button type="button" onClick={() => loadReports()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">새로고침</button>
            </div>
          </div>
          {selectedReportIds.size > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-sky-50/70 px-4 py-3">
              <span className="text-sm font-black text-sky-800">{selectedReportIds.size}건 선택됨</span>
              <div className="flex flex-wrap items-center gap-2">
                {canOperateReports ? (
                  <>
                    <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} disabled={bulkAction !== null} aria-label="선택 신고 변경 상태" className="h-9 rounded-lg border border-sky-200 bg-white px-3 text-xs font-bold text-sky-800 disabled:opacity-50">
                      {reportStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <button type="button" onClick={handleBulkStatusChange} disabled={bulkAction !== null} className="h-9 rounded-lg bg-sky-700 px-3 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-50">
                      {bulkAction === "status" ? "변경 중" : "선택 상태 변경"}
                    </button>
                    <button type="button" onClick={handleBulkAnalysis} disabled={bulkAction !== null} className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
                      {bulkAction === "analysis" ? "요청 중" : "선택 분석 요청"}
                    </button>
                  </>
                ) : null}
                <button type="button" onClick={handleCompareSelected} disabled={!canCompareSelected || bulkAction !== null} title={canCompareSelected ? undefined : "완료된 분석 Job이 있는 신고를 2~5개 선택해 주세요."} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  선택 비교분석 ({selectedCompletedJobIds.length})
                </button>
              </div>
            </div>
          ) : null}
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-11 px-2 py-3 text-center"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllReports(event.target.checked)} aria-label="현재 신고 전체 선택" className="h-4 w-4 rounded border-slate-300" /></th>
                  <th className="w-[18%] px-2 py-3">제목</th>
                  <th className="w-[10%] px-2 py-3">신고 유형</th>
                  <th className="w-[8%] px-2 py-3">상태</th>
                  <th className="w-[8%] px-2 py-3">우선순위</th>
                  <th className="w-[8%] px-2 py-3">위험도</th>
                  <th className="w-[11%] px-2 py-3">AI 분석</th>
                  <th className="w-[12%] px-2 py-3">등록일</th>
                  <th className="w-[220px] px-2 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const status = getReportStatus(report);
                  const priority = getReportPriority(report);
                  const type = getReportType(report);
                  const analysisStatus = getReportAnalysisStatus(report);
                  const detectionCount = getReportDetectionCount(report);
                  const processedFrames = getReportProcessedFrames(report);
                  return (
                    <tr key={getReportId(report)} className="border-t border-slate-100">
                      <td className="px-2 py-4 text-center">
                        <input type="checkbox" checked={selectedReportIds.has(getReportId(report))} onChange={(event) => toggleReport(getReportId(report), event.target.checked)} aria-label={getReportTitle(report) + " 선택"} className="h-4 w-4 rounded border-slate-300" />
                      </td>
                      <td className="min-w-0 px-2 py-4">
                        <b className="block truncate text-slate-950" title={getReportTitle(report)}>{getReportTitle(report)}</b>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-400">{getReportCode(report)} · {getReportLocation(report)}</p>
                      </td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-600" title={typeLabels[type] ?? type}>{typeLabels[type] ?? type}</td>
                      <td className="truncate whitespace-nowrap px-2 py-4"><Badge tone={getBadgeTone(status)}>{statusLabels[status] ?? status}</Badge></td>
                      <td className="truncate whitespace-nowrap px-2 py-4"><Badge tone={getBadgeTone(priority)}>{priorityLabels[priority] ?? priority}</Badge></td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-600">{getReportRiskText(report)}</td>
                      <td className="min-w-0 px-2 py-4">
                        {analysisStatus ? (
                          <div className="space-y-1">
                            <Badge tone={getBadgeTone(analysisStatus)}>{analysisStatusLabels[analysisStatus] ?? analysisStatus}</Badge>
                            {detectionCount || processedFrames ? (
                              <p className="text-xs font-semibold text-slate-400">
                                {detectionCount ? `감지 ${detectionCount}건` : null}
                                {detectionCount && processedFrames ? " · " : null}
                                {processedFrames ? `프레임 ${processedFrames}` : null}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">-</span>
                        )}
                      </td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-500" title={formatDateTime(getReportCreatedAt(report))}>{formatDateTime(getReportCreatedAt(report))}</td>
                      <td className="px-2 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Link href={`/reports/${getReportId(report)}`} className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">상세 보기</Link>
                          <Link href={`/reports/analysis-comparisons?report_id=${getReportId(report)}`} className="inline-flex h-8 items-center rounded-lg border border-sky-200 px-2 text-xs font-bold text-sky-700 no-underline transition hover:bg-sky-50">비교분석</Link>
                          {canOperateReports ? <button type="button" onClick={() => handleRequestAnalysis(report)} disabled={analyzingId === getReportId(report)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            분석
                          </button> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && reports.length === 0 ? <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">조건에 맞는 신고 등록 내역이 없습니다.</p> : null}
          {result.total_pages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <button type="button" disabled={!canPrev} onClick={() => updateFilter({ page: filter.page - 1 })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">이전</button>
              <span className="text-xs font-bold text-slate-500">{result.page} / {result.total_pages}</span>
              <button type="button" disabled={!canNext} onClick={() => updateFilter({ page: filter.page + 1 })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">다음</button>
            </div>
          ) : null}
        </section> : null}
      </AppLayout>
    </RequireAuth>
  );
}
