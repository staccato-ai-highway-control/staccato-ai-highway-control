"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertTriangle, Maximize2 } from "lucide-react";
import { MediaLightbox } from "@/components/common/MediaLightbox";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { normalizeMediaUrl } from "@/lib/mediaUrl";
import { isApiError } from "@/lib/apiClient";
import {
  getReport,
  getModelComparisonModels,
  startModelComparison,
  getModelComparisonBatch,
} from "@/features/reports/api";
import type { Report } from "@/features/reports/types";
import type {
  ModelComparisonBatchStatus,
  ModelComparisonItem,
} from "@/features/reports/types";

// ─── 상수 ──────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = ["COMPLETED", "PARTIAL_FAILED", "FAILED"];
const POLL_INTERVAL_MS = 3000;
const MAX_MODELS = 3;
const MODEL_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981"];

// ─── 유틸 ──────────────────────────────────────────────────────────────────

type Phase = "loading" | "starting" | "polling" | "done" | "error";

const PHASE_LABEL: Record<Phase, string> = {
  loading: "신고 정보 및 모델 목록을 불러오는 중입니다.",
  starting: "분석 요청을 시작하는 중입니다.",
  polling: "모델 분석 중... (3초 간격으로 확인합니다)",
  done: "",
  error: "",
};

function runStatusTone(status: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (status === "COMPLETED") return "green";
  if (status === "FAILED") return "red";
  if (status === "RUNNING") return "amber";
  if (status === "QUEUED") return "blue";
  return "slate";
}

function batchStatusTone(status: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (status === "COMPLETED") return "green";
  if (status === "FAILED") return "red";
  if (status === "PARTIAL_FAILED") return "amber";
  if (status === "RUNNING" || status === "QUEUED") return "amber";
  return "slate";
}

// ─── 메트릭 차트 ──────────────────────────────────────────────────────────

interface MetricDef {
  key: keyof ModelComparisonItem;
  label: string;
  unit: string;
  decimals: number;
  transform?: (v: number) => number;
}

const METRICS: MetricDef[] = [
  { key: "detection_count", label: "탐지 건수", unit: "건", decimals: 0 },
  {
    key: "avg_confidence",
    label: "평균 신뢰도",
    unit: "%",
    decimals: 1,
    transform: (v) => (v > 1 ? v : v * 100),
  },
  { key: "inference_ms", label: "추론 시간", unit: "ms", decimals: 0 },
  { key: "inference_fps", label: "초당 프레임", unit: " fps", decimals: 1 },
  { key: "total_elapsed_ms", label: "총 소요 시간", unit: "ms", decimals: 0 },
];

function MetricChart({
  results,
  metric,
}: {
  results: ModelComparisonItem[];
  metric: MetricDef;
}) {
  const data = results.map((r, i) => {
    const raw = r[metric.key];
    const num = raw == null ? 0 : Number(raw);
    const value = metric.transform ? metric.transform(num) : num;
    return { name: r.model_name, value, color: MODEL_COLORS[i % MODEL_COLORS.length] };
  });

  const allZero = data.every((d) => d.value === 0);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-black text-slate-700">{metric.label}</h4>
      {allZero ? (
        <div className="flex h-[160px] items-center justify-center text-xs font-semibold text-slate-400">
          데이터 없음
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: number) => [
                `${value.toFixed(metric.decimals)}${metric.unit}`,
                metric.label,
              ]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                fontWeight: 700,
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── 결과 카드 ─────────────────────────────────────────────────────────────

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url);
}

function ResultCard({
  item,
  colorIndex,
}: {
  item: ModelComparisonItem;
  colorIndex: number;
}) {
  const mediaUrl = normalizeMediaUrl(item.annotated_media_url);
  const isFailed = item.run_status === "FAILED";
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;
  const color = MODEL_COLORS[colorIndex % MODEL_COLORS.length];
  const [lightbox, setLightbox] = useState(false);

  return (
    <div className="flex flex-col gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className="h-1 w-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate font-black text-slate-950">{item.model_name}</h4>
          <Badge tone={runStatusTone(item.run_status)} className="shrink-0">
            {item.run_status}
          </Badge>
        </div>

        {isFailed ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {item.error_message ?? "분석 실패"}
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                {
                  label: "탐지 건수",
                  value: item.detection_count != null ? `${item.detection_count}건` : "-",
                },
                {
                  label: "평균 신뢰도",
                  value:
                    item.avg_confidence != null
                      ? `${(item.avg_confidence > 1 ? item.avg_confidence : item.avg_confidence * 100).toFixed(1)}%`
                      : "-",
                },
                {
                  label: "추론 시간",
                  value: item.inference_ms != null ? `${item.inference_ms} ms` : "-",
                },
                {
                  label: "초당 프레임",
                  value:
                    item.inference_fps != null
                      ? `${Number(item.inference_fps).toFixed(1)} fps`
                      : "-",
                },
                {
                  label: "총 소요 시간",
                  value:
                    item.total_elapsed_ms != null ? `${item.total_elapsed_ms} ms` : "-",
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-400">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>

            {mediaUrl ? (
              <button
                type="button"
                className="group relative mt-1 w-full cursor-zoom-in overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                onClick={() => setLightbox(true)}
                aria-label="확대해서 보기"
              >
                {isVideo ? (
                  <video
                    src={mediaUrl}
                    className="w-full rounded-lg"
                    style={{ maxHeight: "220px" }}
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={`${item.model_name} 탐지 결과`}
                    className="w-full rounded-lg object-contain"
                    style={{ maxHeight: "220px" }}
                  />
                )}
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs font-bold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <Maximize2 className="h-3 w-3" />
                  확대
                </span>
              </button>
            ) : null}

            {lightbox && mediaUrl ? (
              <MediaLightbox
                src={mediaUrl}
                isVideo={isVideo}
                alt={`${item.model_name} 탐지 결과`}
                onClose={() => setLightbox(false)}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

export default function ModelComparisonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batchId?: string }>;
}) {
  const { id } = use(params);
  const { batchId: viewBatchId } = use(searchParams);

  const [phase, setPhase] = useState<Phase>("loading");
  const [report, setReport] = useState<Report | null>(null);
  const [batchStatus, setBatchStatus] = useState<ModelComparisonBatchStatus | null>(null);
  const [results, setResults] = useState<ModelComparisonItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let disposed = false;

    async function poll(batchId: string | number) {
      if (disposed) return;
      try {
        const data = await getModelComparisonBatch(batchId);
        if (disposed) return;

        // [3] polling 매 회차
        console.log("[STACCATO-DEBUG] polling 회차 — batchId:", batchId, "응답 전체:", data);

        const status = (data.batch?.status ?? data.batch?.batch_status ?? data.status ?? "UNKNOWN") as string;
        const newResults = (data.batch?.runs ?? data.batch?.results ?? data.runs ?? data.results ?? []) as ModelComparisonItem[];

        console.log("[STACCATO-DEBUG] polling runs:", newResults.map((r) => ({
          model_name: r.model_name,
          run_status: r.run_status,
          detection_count: r.detection_count,
        })));

        setBatchStatus(status);
        setResults(newResults);

        if (TERMINAL_STATUSES.includes(status)) {
          // [4] polling 종료
          console.log("[STACCATO-DEBUG] polling 종료 — 최종 상태:", status, "최종 runs:", newResults);
          setPhase("done");
        } else {
          timerRef.current = window.setTimeout(() => poll(batchId), POLL_INTERVAL_MS);
        }
      } catch {
        if (!disposed) {
          setErrorMsg("분석 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          setPhase("error");
        }
      }
    }

    // 기존 배치 조회 모드 (이력 페이지에서 진입)
    async function viewExisting(batchId: string) {
      try {
        const reportData = await getReport(id);
        if (disposed) return;
        setReport(reportData);
        setPhase("polling");
        timerRef.current = window.setTimeout(() => poll(batchId), 100);
      } catch (err) {
        if (!disposed) {
          setErrorMsg(err instanceof Error ? err.message : "신고 정보를 불러오지 못했습니다.");
          setPhase("error");
        }
      }
    }

    async function run() {
      try {
        const [reportData, models] = await Promise.all([
          getReport(id),
          getModelComparisonModels(),
        ]);
        if (disposed) return;

        // [1] 모델 목록 조회
        console.log("[STACCATO-DEBUG] 모델 목록 조회 완료:", models);

        setReport(reportData);

        if (models.length === 0) {
          setErrorMsg("사용 가능한 분석 모델이 없습니다.");
          setPhase("error");
          return;
        }

        const attachmentId =
          reportData.attachments?.[0]?.attachment_id ??
          reportData.attachments?.[0]?.id ??
          reportData.attachment_id;

        if (attachmentId == null) {
          setErrorMsg("분석할 첨부파일이 없습니다. 신고에 미디어를 먼저 업로드해 주세요.");
          setPhase("error");
          return;
        }

        const modelIds = models.slice(0, MAX_MODELS).map((m) => m.model_id);
        setPhase("starting");

        // [2] 분석 시작 POST 요청 body
        console.log("[STACCATO-DEBUG] 분석 시작 요청 body:", { attachment_id: Number(attachmentId), model_ids: modelIds });

        let batchId: string | number | null = null;

        try {
          const startResponse = await startModelComparison(id, {
            attachment_id: Number(attachmentId),
            model_ids: modelIds,
          });
          batchId = startResponse.batch?.id ?? null;
          // [2] 분석 시작 응답
          console.log("[STACCATO-DEBUG] 분석 시작 응답 batchId:", batchId);
        } catch (err) {
          // 409: 동일 조합이 이미 실행 중 → 기존 배치 ID를 이어서 polling
          if (isApiError(err) && err.statusCode === 409) {
            const payload = err.payload as { batch?: { id?: string | number } } | undefined;
            batchId = payload?.batch?.id ?? null;
            if (batchId == null) {
              if (!disposed) {
                setErrorMsg("이미 진행 중인 비교 분석이 있으나 배치 정보를 가져오지 못했습니다.");
                setPhase("error");
              }
              return;
            }
          } else {
            throw err;
          }
        }

        if (disposed) return;
        if (batchId == null) throw new Error("서버에서 batch ID를 반환하지 않았습니다.");

        setPhase("polling");
        timerRef.current = window.setTimeout(() => poll(batchId!), POLL_INTERVAL_MS);
      } catch (err) {
        if (!disposed) {
          setErrorMsg(err instanceof Error ? err.message : "오류가 발생했습니다.");
          setPhase("error");
        }
      }
    }

    if (viewBatchId) {
      viewExisting(viewBatchId);
    } else {
      run();
    }

    return () => {
      disposed = true;
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    };
  }, [id]);

  // [5] 결과 렌더링 시
  useEffect(() => {
    if (results.length > 0) {
      console.log("[STACCATO-DEBUG] 결과 렌더링 데이터:", results.map((r) => ({
        model_name: r.model_name,
        run_status: r.run_status,
        detection_count: r.detection_count,
        avg_confidence: r.avg_confidence,
        inference_ms: r.inference_ms,
        inference_fps: r.inference_fps,
        total_elapsed_ms: r.total_elapsed_ms,
      })));
    }
  }, [results]);

  const completedResults = results.filter((r) => r.run_status === "COMPLETED");
  const isActive = phase === "loading" || phase === "starting" || phase === "polling";
  const reportTitle = report ? (report.title ?? report.subject ?? `신고 #${id}`) : `신고 #${id}`;

  return (
    <RequireAuth>
      <AppLayout title="모델 성능 비교">
        {/* 상단 네비게이션 */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            href="/reports"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 no-underline transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            신고 목록
          </Link>
          {report && (
            <Link
              href={`/reports/${id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 no-underline transition hover:bg-slate-50"
            >
              신고 상세
            </Link>
          )}
        </div>

        {/* 페이지 헤더 */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black text-slate-950">모델 성능 비교</h2>
            {batchStatus ? (
              <Badge tone={batchStatusTone(batchStatus)}>{batchStatus}</Badge>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-500">
            {reportTitle} · 최대 {MAX_MODELS}개 모델의 탐지 성능을 자동으로 비교합니다.
          </p>
        </div>

        {/* 로딩 상태 */}
        {isActive ? (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 px-5 py-4">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-sky-500" />
            <span className="text-sm font-bold text-sky-800">{PHASE_LABEL[phase]}</span>
          </div>
        ) : null}

        {/* 오류 상태 */}
        {phase === "error" ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-black text-red-800">분석을 시작할 수 없습니다</p>
              <p className="mt-0.5 text-sm font-semibold text-red-700">{errorMsg}</p>
            </div>
          </div>
        ) : null}

        {/* 차트 섹션 */}
        {completedResults.length > 0 ? (
          <section className="mb-8">
            <h3 className="mb-4 text-base font-black text-slate-800">지표별 모델 비교</h3>
            {/* 모델 범례 */}
            <div className="mb-4 flex flex-wrap gap-3">
              {results.map((r, i) => (
                <span key={r.model_name} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }}
                    aria-hidden="true"
                  />
                  {r.model_name}
                </span>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {METRICS.map((metric) => (
                <MetricChart
                  key={metric.key}
                  results={completedResults}
                  metric={metric}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* 모델별 결과 카드 */}
        {results.length > 0 ? (
          <section>
            <h3 className="mb-4 text-base font-black text-slate-800">모델별 분석 결과</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item, i) => (
                <ResultCard key={`${item.model_name}-${i}`} item={item} colorIndex={i} />
              ))}
            </div>
          </section>
        ) : null}

        {/* 결과 없음 (완료됐지만 결과 0건) */}
        {phase === "done" && results.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
            분석 결과가 없습니다.
          </div>
        ) : null}
      </AppLayout>
    </RequireAuth>
  );
}
