"use client";

import Link from "next/link";
import { BarChart2, FileVideo, ImageIcon, Loader2, Search, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorPage } from "@/components/common/ErrorPage";
import { Badge } from "@/components/common/Badge";
import { getMyReports, getReports, previewReportAttachment, previewReportAttachmentUrl, requestReportAnalysis } from "@/features/reports/api";
import type { AuthUser } from "@/features/auth/types";
import type { PaginatedReports, Report, ReportListParams } from "@/features/reports/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { normalizeMediaUrl } from "@/lib/mediaUrl";

// ─── 필터 타입 ────────────────────────────────────────────────────────────────

type ReportFilter = {
  keyword: string;
  status: string;
  report_type: string;
  priority: string;
  page: number;
  size: number;
  mine: boolean;
};

// ─── 셀렉트 옵션 ──────────────────────────────────────────────────────────────

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

// ─── 레이블 맵 ────────────────────────────────────────────────────────────────

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

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

function getReportId(report: Report) { return String(report.id); }
function getReportCode(report: Report) { return report.report_code ?? report.reportCode ?? `#${report.id}`; }
function getReportTitle(report: Report) { return report.title ?? report.subject ?? "제목 없음"; }
function getReportType(report: Report) { return report.report_type ?? report.reportType ?? "GENERAL"; }
function getReportStatus(report: Report) { return report.status ?? "SUBMITTED"; }
function getReportPriority(report: Report) { return report.priority ?? "NORMAL"; }
function getReportCreatedAt(report: Report) { return report.submitted_at ?? report.created_at ?? report.createdAt ?? "-"; }
function getReportLocation(report: Report) { return report.location ?? report.address ?? report.place_name ?? "-"; }

type ReportWithAnalysisAliases = Report & {
  latestJob?: Report["latest_job"];
  latestAnalysisJob?: Report["latest_job"];
  latest_analysis_job?: Report["latest_job"];
  ai_analysis_status?: string | null;
};

type AnalysisJobWithMetrics = NonNullable<Report["latest_job"]> & {
  detection_count?: number | string | null;
  detected_count?: number | string | null;
};

function getLatestAnalysisJob(report: Report): AnalysisJobWithMetrics | null {
  const r = report as ReportWithAnalysisAliases;
  const jobs = r.analysis_jobs ?? r.analysisJobs ?? [];
  return (
    (r.latest_job as AnalysisJobWithMetrics | null | undefined) ??
    (r.latestJob as AnalysisJobWithMetrics | null | undefined) ??
    (r.latestAnalysisJob as AnalysisJobWithMetrics | null | undefined) ??
    (r.latest_analysis_job as AnalysisJobWithMetrics | null | undefined) ??
    (jobs[0] as AnalysisJobWithMetrics | undefined) ??
    null
  );
}

function getReportAnalysisStatus(report: Report) {
  const r = report as ReportWithAnalysisAliases;
  const job = getLatestAnalysisJob(report);
  return r.analysis_status ?? r.analysisStatus ?? r.ai_analysis_status ?? job?.job_status ?? job?.status ?? null;
}

function getBadgeTone(value: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (["REJECTED", "DELETED", "URGENT", "HIGH", "CRITICAL"].includes(value)) return "red";
  if (["ANALYZING", "MEDIUM"].includes(value)) return "amber";
  if (["CONVERTED_TO_INCIDENT", "COMPLETED", "LOW"].includes(value)) return "green";
  if (["REVIEWING", "REQUESTED", "NORMAL"].includes(value)) return "blue";
  return "slate";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
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

// ─── 미디어 프리뷰 헬퍼 ───────────────────────────────────────────────────────

function getAttachmentId(report: Report) {
  const att = report.attachments?.[0];
  return att?.attachment_id ?? att?.id ?? report.attachment_id ?? null;
}

function getPreviewPath(report: Report): string | null {
  const att = report.attachments?.[0];
  const raw = att?.preview_url ?? report.preview_url ?? report.thumbnail_url ?? att?.file_url ?? null;
  return raw ? (normalizeMediaUrl(raw) ?? null) : null;
}

function isVideo(report: Report): boolean {
  const type = report.attachment_type ?? report.attachments?.[0]?.mime_type ?? report.attachments?.[0]?.file_type ?? "";
  return type.startsWith("video") || type === "video";
}

// ─── 카드 미디어 섹션 (Blob URL 방식 — Bearer 토큰 포함 fetch) ───────────────

function ReportMediaPreview({ report }: { report: Report }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const video = isVideo(report);

  useEffect(() => {
    let disposed = false;
    let blobUrl: string | null = null;

    async function load() {
      const attachmentId = getAttachmentId(report);
      const previewPath = getPreviewPath(report);
      if (!attachmentId && !previewPath) return;

      try {
        const blob = attachmentId
          ? await previewReportAttachment(attachmentId)
          : await previewReportAttachmentUrl(previewPath as string);
        if (disposed) return;
        blobUrl = URL.createObjectURL(blob);
        setObjectUrl(blobUrl);
      } catch {
        // 조용히 실패 — 플레이스홀더 유지
      }
    }

    load();
    return () => {
      disposed = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id]);

  if (objectUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        {video ? (
          <>
            <video
              src={objectUrl}
              className="h-full w-full object-cover"
              muted
              playsInline
              onLoadedData={() => setLoaded(true)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow">
                <FileVideo className="h-5 w-5 text-slate-700" aria-hidden="true" />
              </span>
            </div>
          </>
        ) : (
          <img
            src={objectUrl}
            alt={getReportTitle(report)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center bg-slate-100">
      {video
        ? <FileVideo className="h-8 w-8 text-slate-300" aria-hidden="true" />
        : <ImageIcon className="h-8 w-8 text-slate-300" aria-hidden="true" />}
    </div>
  );
}

// ─── 신고 카드 ────────────────────────────────────────────────────────────────

function ReportCard({
  report,
  canOperate,
  analyzingId,
  onRequestAnalysis,
}: {
  report: Report;
  canOperate: boolean;
  analyzingId: string | null;
  onRequestAnalysis: (report: Report) => void;
}) {
  const id = getReportId(report);
  const status = getReportStatus(report);
  const priority = getReportPriority(report);
  const type = getReportType(report);
  const analysisStatus = getReportAnalysisStatus(report);
  const isAnalyzing = analyzingId === id;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_-8px_rgba(15,23,42,0.15)] transition hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.2)]">
      {/* 미디어 프리뷰 */}
      <ReportMediaPreview report={report} />

      {/* 카드 본문 */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* 뱃지 행 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={getBadgeTone(status)} className="text-[10px]">
            {statusLabels[status] ?? status}
          </Badge>
          <Badge tone={getBadgeTone(priority)} className="text-[10px]">
            {priorityLabels[priority] ?? priority}
          </Badge>
          {analysisStatus && (
            <Badge tone={getBadgeTone(analysisStatus)} className="text-[10px]">
              {analysisStatusLabels[analysisStatus] ?? analysisStatus}
            </Badge>
          )}
        </div>

        {/* 제목 + 메타 */}
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-black leading-snug text-slate-950">
            {getReportTitle(report)}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
            {getReportCode(report)}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
            {typeLabels[type] ?? type} · {getReportLocation(report)}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {formatDate(getReportCreatedAt(report))}
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="mt-auto flex flex-col gap-2 pt-1">
          <div className="flex gap-1.5">
            <Link
              href={`/reports/${id}`}
              className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-slate-200 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50"
            >
              상세 보기
            </Link>
            <Link
              href={`/reports/${id}/model-comparison`}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-sky-200 bg-sky-50 text-xs font-bold text-sky-700 no-underline transition hover:bg-sky-100"
            >
              <BarChart2 className="h-3 w-3" aria-hidden="true" />
              모델 비교
            </Link>
          </div>
          {canOperate && (
            <button
              type="button"
              onClick={() => onRequestAnalysis(report)}
              disabled={isAnalyzing}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {isAnalyzing ? "분석 요청 중…" : "AI 분석 요청"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [filter, setFilter] = useState<ReportFilter>({
    keyword: "", status: "", report_type: "", priority: "", page: 1, size: 8, mine: false,
  });
  const [draftKeyword, setDraftKeyword] = useState("");
  const [result, setResult] = useState<PaginatedReports>({ items: [], page: 1, size: 8, total_count: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  async function loadReports(nextFilter = filter) {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = toParams(nextFilter);
      const nextResult = nextFilter.mine
        ? await getMyReports(params)
        : await getReports({ ...params, mine: nextFilter.mine || undefined });
      setResult(nextResult);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "신고 목록을 불러오지 못했습니다.");
      setResult((cur) => ({ ...cur, items: [] }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
    loadReports();
  }, [filter.keyword, filter.status, filter.report_type, filter.priority, filter.page, filter.size, filter.mine]);

  function updateFilter(patch: Partial<ReportFilter>) {
    setFilter((cur) => ({ ...cur, ...patch, page: patch.page ?? 1 }));
  }

  function handleSearch() {
    setFilter((cur) => ({ ...cur, keyword: draftKeyword, page: 1 }));
  }

  async function handleRequestAnalysis(report: Report) {
    const id = getReportId(report);
    setAnalyzingId(id);
    setErrorMessage(null);
    try {
      await requestReportAnalysis(id);
      await loadReports();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 분석 요청에 실패했습니다.");
    } finally {
      setAnalyzingId(null);
    }
  }

  const canOperate =
    authUser?.account_status?.toUpperCase() === "ACTIVE" &&
    ["SUPER_ADMIN", "CONTROL_ADMIN"].includes(authUser.role ?? "");

  const reports = useMemo(
    () => result.items.filter((r) => getReportStatus(r) !== "DELETED"),
    [result.items]
  );

  const canPrev = result.page > 1;
  const canNext = result.total_pages > 0 && result.page < result.total_pages;

  return (
    <RequireAuth>
      <AppLayout title="신고 목록">
        {/* 헤더 */}
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">신고 목록</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">신고 목록과 분석 요청 상태를 조회합니다.</p>
          </div>
          <Link
            href="/reports/create"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white no-underline transition hover:bg-staccato-dark"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            신고 등록
          </Link>
        </section>

        {/* 필터 */}
        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto_auto] xl:items-center">
            <div className="relative flex gap-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={draftKeyword}
                onChange={(e) => setDraftKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="제목, 위치, 코드 검색"
                className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
              />
              <button type="button" onClick={handleSearch} className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                검색
              </button>
            </div>
            <select value={filter.status} onChange={(e) => updateFilter({ status: e.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filter.report_type} onChange={(e) => updateFilter({ report_type: e.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filter.priority} onChange={(e) => updateFilter({ priority: e.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {priorityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={filter.mine} onChange={(e) => updateFilter({ mine: e.target.checked })} className="h-4 w-4" />
              내 신고만
            </label>
          </div>
        </section>

        {/* 에러 */}
        {errorMessage && !loading && result.items.length === 0 ? (
          <ErrorPage statusCode={500} title="신고 목록을 불러오지 못했습니다" description={errorMessage} actionLabel="다시 시도" actionHref={undefined} onAction={() => loadReports()} secondaryActionLabel="대시보드로 이동" secondaryActionHref="/dashboard" />
        ) : null}
        {errorMessage && result.items.length > 0 ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div>
        ) : null}

        {/* 카드 그리드 */}
        {!(errorMessage && !loading && result.items.length === 0) && (
          <section>
            {/* 상단 컨트롤 바 */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-700">
                {loading ? "불러오는 중…" : `전체 ${result.total_count || reports.length}건`}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={filter.size}
                  onChange={(e) => updateFilter({ size: Number(e.target.value) })}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700"
                >
                  {[8, 16, 32].map((s) => <option key={s} value={s}>{s}개</option>)}
                </select>
                <button type="button" onClick={() => loadReports()} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                  새로고침
                </button>
              </div>
            </div>

            {/* 로딩 */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-24 text-sm font-bold text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                불러오는 중입니다.
              </div>
            )}

            {/* 그리드 */}
            {!loading && reports.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {reports.map((report) => (
                  <ReportCard
                    key={getReportId(report)}
                    report={report}
                    canOperate={canOperate}
                    analyzingId={analyzingId}
                    onRequestAnalysis={handleRequestAnalysis}
                  />
                ))}
              </div>
            )}

            {/* 빈 상태 */}
            {!loading && reports.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500">
                조건에 맞는 신고 내역이 없습니다.
              </div>
            )}

            {/* 페이지네이션 */}
            {result.total_pages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  disabled={!canPrev}
                  onClick={() => updateFilter({ page: filter.page - 1 })}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  이전
                </button>
                <span className="text-xs font-bold text-slate-500">
                  {result.page} / {result.total_pages}
                </span>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => updateFilter({ page: filter.page + 1 })}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            )}
          </section>
        )}
      </AppLayout>
    </RequireAuth>
  );
}
