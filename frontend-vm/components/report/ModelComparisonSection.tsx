"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Maximize2 } from "lucide-react";
import { MediaLightbox } from "@/components/common/MediaLightbox";
import { RetryableVideo } from "@/components/common/RetryableVideo";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { cn } from "@/lib/utils";
import { normalizeMediaUrl } from "@/lib/mediaUrl";
import {
  getModelComparisonModels,
  startModelComparison,
  getModelComparisonBatch,
} from "@/features/reports/api";
import type {
  ModelComparisonBatchStatus,
  ModelComparisonItem,
  ModelComparisonModel,
} from "@/features/reports/types";

// ─── 상수 ──────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES: string[] = ["COMPLETED", "PARTIAL_FAILED", "FAILED"];
const MAX_MODELS = 3;
const POLL_INTERVAL_MS = 3000;

// ─── 유틸 ──────────────────────────────────────────────────────────────────

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
  if (status === "RUNNING") return "amber";
  return "slate";
}

function fmt(value: number | null | undefined, unit: string, decimals = 0): string {
  if (value == null) return "-";
  return `${value.toFixed(decimals)}${unit}`;
}

function fmtConf(value: number | null | undefined): string {
  if (value == null) return "-";
  const pct = value > 1 ? value : value * 100;
  return `${pct.toFixed(1)}%`;
}

// ─── 결과 카드 ─────────────────────────────────────────────────────────────

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url);
}

function ResultCard({ item }: { item: ModelComparisonItem }) {
  const mediaUrl = normalizeMediaUrl(item.annotated_media_url);
  const isFailed = item.run_status === "FAILED";
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;
  const [lightbox, setLightbox] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
              { label: "탐지 개수", value: item.detection_count != null ? String(item.detection_count) : "-" },
              { label: "평균 신뢰도", value: fmtConf(item.avg_confidence) },
              { label: "추론 시간", value: fmt(item.inference_ms, " ms") },
              { label: "추론 FPS", value: fmt(item.inference_fps, " fps", 1) },
              { label: "총 소요", value: fmt(item.total_elapsed_ms, " ms") },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
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
                <RetryableVideo
                  src={mediaUrl}
                  className="w-full rounded-lg"
                  style={{ maxHeight: "180px" }}
                  errorMessage="영상을 불러오지 못했습니다."
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={`${item.model_name} 탐지 결과`}
                  className="w-full rounded-lg object-contain"
                  style={{ maxHeight: "180px" }}
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
  );
}

// ─── 모델 체크박스 ─────────────────────────────────────────────────────────

function ModelCheckbox({
  model,
  checked,
  disabled,
  onToggle,
}: {
  model: ModelComparisonModel;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold transition-colors",
        checked
          ? "border-sky-300 bg-sky-50 text-sky-800"
          : disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-60"
          : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50/50"
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <span
        className={cn(
          "h-4 w-4 shrink-0 rounded border-2 transition-colors",
          checked ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white"
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 truncate">{model.model_id}</span>
      {model.model_name && model.model_name !== model.model_id ? (
        <span className="ml-auto shrink-0 text-xs font-semibold text-slate-400">{model.model_name}</span>
      ) : null}
    </label>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────

export interface ModelComparisonSectionProps {
  reportId: string;
  attachmentId: number | string | null | undefined;
}

export function ModelComparisonSection({ reportId, attachmentId }: ModelComparisonSectionProps) {
  const [models, setModels] = useState<ModelComparisonModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [batchId, setBatchId] = useState<string | number | null>(null);
  const [batchStatus, setBatchStatus] = useState<ModelComparisonBatchStatus | null>(null);
  const [results, setResults] = useState<ModelComparisonItem[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모델 목록 로드
  useEffect(() => {
    let disposed = false;

    async function load() {
      try {
        const data = await getModelComparisonModels();
        // [1] 모델 목록 조회
        console.log("[STACCATO-DEBUG] [Section] 모델 목록 조회 완료:", data);
        if (!disposed) setModels(data);
      } catch {
        if (!disposed) setModels([]);
      } finally {
        if (!disposed) setLoadingModels(false);
      }
    }

    load();
    return () => { disposed = true; };
  }, []);

  // polling — batchId가 바뀔 때만 실행, 내부에서 terminal 상태 감지하여 중단
  const batchIdRef = useRef(batchId);
  batchIdRef.current = batchId;

  useEffect(() => {
    if (!batchId) return;

    let disposed = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const data = await getModelComparisonBatch(batchIdRef.current!);
        if (disposed) return;

        // [3] polling 매 회차
        console.log("[STACCATO-DEBUG] [Section] polling 회차 — batchId:", batchIdRef.current, "응답 전체:", data);

        const newStatus = (data.batch?.status ?? data.batch?.batch_status ?? data.status ?? "UNKNOWN") as string;
        const newResults = (data.batch?.runs ?? data.batch?.results ?? data.runs ?? data.results ?? []) as ModelComparisonItem[];

        console.log("[STACCATO-DEBUG] [Section] polling runs:", newResults.map((r) => ({
          model_name: r.model_name,
          run_status: r.run_status,
          detection_count: r.detection_count,
        })));

        setBatchStatus(newStatus);
        setResults(newResults);

        if (TERMINAL_STATUSES.includes(newStatus)) {
          // [4] polling 종료
          console.log("[STACCATO-DEBUG] [Section] polling 종료 — 최종 상태:", newStatus, "최종 runs:", newResults);
          setIsPolling(false);
        } else {
          timer = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!disposed) {
          setIsPolling(false);
          setError("분석 결과를 불러오지 못했습니다.");
        }
      }
    }

    setIsPolling(true);
    timer = window.setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [batchId]);

  // [5] 결과 렌더링 시
  useEffect(() => {
    if (results.length > 0) {
      console.log("[STACCATO-DEBUG] [Section] 결과 렌더링 데이터:", results.map((r) => ({
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

  function toggleModel(modelId: string) {
    setSelectedModelIds((prev) => {
      if (prev.includes(modelId)) return prev.filter((id) => id !== modelId);
      if (prev.length >= MAX_MODELS) return prev;
      return [...prev, modelId];
    });
  }

  async function handleStart() {
    if (selectedModelIds.length === 0) return;
    if (attachmentId == null) {
      setError("분석할 첨부파일이 없습니다. 첨부파일을 먼저 업로드해 주세요.");
      return;
    }

    setIsStarting(true);
    setError(null);
    setBatchStatus(null);
    setResults([]);

    // [2] 분석 시작 POST 요청 body
    console.log("[STACCATO-DEBUG] [Section] 분석 시작 요청 body:", { attachment_id: Number(attachmentId), model_ids: selectedModelIds });

    try {
      const response = await startModelComparison(reportId, {
        attachment_id: Number(attachmentId),
        model_ids: selectedModelIds,
      });
      const newBatchId = response.batch?.id;
      if (newBatchId == null) throw new Error("서버에서 batchId를 반환하지 않았습니다.");
      // [2] 분석 시작 응답
      console.log("[STACCATO-DEBUG] [Section] 분석 시작 응답 batchId:", newBatchId);
      setBatchId(newBatchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 시작에 실패했습니다.");
    } finally {
      setIsStarting(false);
    }
  }

  const canStart = selectedModelIds.length > 0 && attachmentId != null && !isStarting && !isPolling;
  const isTerminal = batchStatus !== null && TERMINAL_STATUSES.includes(batchStatus);

  return (
    <div className="flex flex-col gap-5">
      {/* 모델 선택 */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-black text-slate-700">분석 모델 선택</span>
          <Badge tone={selectedModelIds.length >= MAX_MODELS ? "blue" : "slate"}>
            {selectedModelIds.length} / {MAX_MODELS}
          </Badge>
          <span className="text-xs font-semibold text-slate-400">최대 {MAX_MODELS}개</span>
        </div>

        {loadingModels ? (
          <div className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            모델 목록을 불러오는 중입니다.
          </div>
        ) : models.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            사용 가능한 분석 모델이 없습니다.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => {
              const checked = selectedModelIds.includes(model.model_id);
              const disabled = !checked && selectedModelIds.length >= MAX_MODELS;
              return (
                <ModelCheckbox
                  key={model.model_id}
                  model={model}
                  checked={checked}
                  disabled={disabled}
                  onToggle={() => toggleModel(model.model_id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 시작 버튼 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          className="gap-2"
        >
          {isStarting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              분석 시작 중
            </>
          ) : (
            "분석 시작"
          )}
        </Button>

        {isPolling ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            3초 간격으로 결과를 확인 중입니다.
          </span>
        ) : null}

        {batchStatus ? (
          <Badge tone={batchStatusTone(batchStatus)}>배치 상태: {batchStatus}</Badge>
        ) : null}
      </div>

      {/* 오류 메시지 */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {/* 분석 결과 */}
      {results.length > 0 ? (
        <div>
          <p className="mb-3 text-sm font-black text-slate-700">
            분석 결과
            {isTerminal && batchStatus === "PARTIAL_FAILED" ? (
              <span className="ml-2 text-xs font-semibold text-amber-600">일부 모델 실패</span>
            ) : null}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((item, i) => (
              <ResultCard key={`${item.model_name}-${i}`} item={item} />
            ))}
          </div>
        </div>
      ) : batchId && !isPolling && isTerminal && results.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
          분석 결과가 없습니다.
        </p>
      ) : null}
    </div>
  );
}
