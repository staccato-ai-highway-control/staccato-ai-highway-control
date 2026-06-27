"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart2, Loader2 } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { ErrorPage } from "@/components/common/ErrorPage";
import { getModelComparisonBatches } from "@/features/reports/api";
import type {
  ModelComparisonBatchListItem,
  ModelComparisonBatchStatus,
} from "@/features/reports/types";

// ─── 상수 ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: "전체 상태", value: "" },
  { label: "대기 중", value: "QUEUED" },
  { label: "실행 중", value: "RUNNING" },
  { label: "완료", value: "COMPLETED" },
  { label: "부분 실패", value: "PARTIAL_FAILED" },
  { label: "실패", value: "FAILED" },
];

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "대기 중",
  RUNNING: "실행 중",
  COMPLETED: "완료",
  PARTIAL_FAILED: "부분 실패",
  FAILED: "실패",
};

const RUN_STATUS_LABELS: Record<string, string> = {
  QUEUED: "대기",
  RUNNING: "실행중",
  COMPLETED: "완료",
  FAILED: "실패",
};

// ─── 유틸 ──────────────────────────────────────────────────────────────────

function batchStatusTone(
  status?: string
): "slate" | "blue" | "green" | "amber" | "red" {
  if (status === "COMPLETED") return "green";
  if (status === "FAILED") return "red";
  if (status === "PARTIAL_FAILED") return "amber";
  if (status === "RUNNING") return "amber";
  if (status === "QUEUED") return "blue";
  return "slate";
}

function runStatusTone(
  status: string
): "slate" | "blue" | "green" | "amber" | "red" {
  if (status === "COMPLETED") return "green";
  if (status === "FAILED") return "red";
  if (status === "RUNNING") return "amber";
  if (status === "QUEUED") return "blue";
  return "slate";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ─── 행 컴포넌트 ───────────────────────────────────────────────────────────

function BatchRow({ batch }: { batch: ModelComparisonBatchListItem }) {
  const status = (batch.batch_status ?? batch.status ?? "") as ModelComparisonBatchStatus;
  const reportId = batch.report_id;
  const reportLabel =
    batch.report_title ?? batch.report_code ?? (reportId ? `신고 #${reportId}` : "-");

  return (
    <tr className="border-t border-slate-100 align-middle hover:bg-slate-50/50">
      <td className="px-3 py-3.5 font-bold text-slate-700">#{String(batch.id)}</td>
      <td className="min-w-0 px-3 py-3.5">
        {reportId ? (
          <Link
            href={`/reports/${reportId}`}
            className="font-bold text-sky-700 no-underline hover:underline"
          >
            {reportLabel}
          </Link>
        ) : (
          <span className="font-semibold text-slate-500">{reportLabel}</span>
        )}
        {batch.report_code && batch.report_title ? (
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {batch.report_code}
          </p>
        ) : null}
      </td>
      <td className="px-3 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          {(batch.runs ?? []).length > 0 ? (
            (batch.runs ?? []).map((run, i) => (
              <span
                key={`${run.model_name}-${i}`}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700"
              >
                <span
                  className={
                    run.run_status === "COMPLETED"
                      ? "text-green-500"
                      : run.run_status === "FAILED"
                      ? "text-red-400"
                      : "text-amber-400"
                  }
                >
                  ●
                </span>
                {run.model_name}
              </span>
            ))
          ) : (
            <span className="text-xs font-semibold text-slate-400">
              {batch.selected_model_count != null
                ? `${batch.selected_model_count}개 모델`
                : "-"}
            </span>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5">
        <Badge tone={batchStatusTone(status)}>
          {STATUS_LABELS[status] ?? (status || "-")}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-xs font-semibold text-slate-500">
        {formatDate(batch.created_at)}
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-xs font-semibold text-slate-500">
        {formatDate(batch.completed_at)}
      </td>
      <td className="px-3 py-3.5">
        {reportId ? (
          <Link
            href={`/reports/${reportId}/model-comparison?batchId=${batch.id}`}
            className="inline-flex h-8 items-center rounded-lg border border-sky-200 px-3 text-xs font-bold text-sky-700 no-underline transition hover:bg-sky-50"
          >
            결과 보기
          </Link>
        ) : (
          <span className="text-xs font-semibold text-slate-400">-</span>
        )}
      </td>
    </tr>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

export default function ModelComparisonListPage() {
  const [batches, setBatches] = useState<ModelComparisonBatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const size = 20;

  async function load(nextPage = page, nextStatus = statusFilter) {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await getModelComparisonBatches({
        page: nextPage,
        size,
        status: nextStatus || undefined,
      });
      setBatches(result.batches ?? []);
      setTotalCount(result.total_count ?? 0);
      setTotalPages(result.total_pages ?? 1);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "목록을 불러오지 못했습니다."
      );
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page, statusFilter);
  }, [page, statusFilter]);

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <RequireAuth>
      <AppLayout title="모델 비교 이력">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-6 w-6 text-sky-600" />
              <h2 className="text-2xl font-black text-slate-950">모델 비교 이력</h2>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              신고별 모델 성능 비교 분석 실행 이력을 조회합니다.
            </p>
          </div>
        </section>

        {/* 필터 */}
        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => load(page, statusFilter)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              새로고침
            </button>
            <span className="ml-auto text-sm font-bold text-slate-500">
              {loading ? "불러오는 중" : `전체 ${totalCount}건`}
            </span>
          </div>
        </section>

        {/* 오류 */}
        {errorMessage && !loading && batches.length === 0 ? (
          <ErrorPage
            statusCode={500}
            title="목록을 불러오지 못했습니다"
            description={errorMessage}
            actionLabel="다시 시도"
            actionHref={undefined}
            onAction={() => load(page, statusFilter)}
            secondaryActionLabel="대시보드로 이동"
            secondaryActionHref="/dashboard"
          />
        ) : null}

        {/* 로딩 */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            불러오는 중입니다.
          </div>
        ) : null}

        {/* 테이블 */}
        {!loading && !(errorMessage && batches.length === 0) ? (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-20 px-3 py-3">ID</th>
                    <th className="px-3 py-3">신고</th>
                    <th className="px-3 py-3">분석 모델</th>
                    <th className="w-28 px-3 py-3">상태</th>
                    <th className="w-36 px-3 py-3">요청일</th>
                    <th className="w-36 px-3 py-3">완료일</th>
                    <th className="w-24 px-3 py-3">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <BatchRow key={batch.id} batch={batch} />
                  ))}
                </tbody>
              </table>
            </div>

            {batches.length === 0 ? (
              <p className="border-t border-slate-100 p-8 text-center text-sm font-semibold text-slate-500">
                {statusFilter
                  ? "해당 상태의 비교 분석 이력이 없습니다."
                  : "비교 분석 이력이 없습니다."}
              </p>
            ) : null}

            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  disabled={!canPrev}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  이전
                </button>
                <span className="text-xs font-bold text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
      </AppLayout>
    </RequireAuth>
  );
}
