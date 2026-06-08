"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { ComparisonResultPanel } from "@/components/report/ComparisonResultPanel";
import type { ComparisonMetricKey, ComparisonMetricType, DisplayComparisonMetric } from "@/components/report/comparisonTypes";
import { createAnalysisComparison, getAnalysisComparisonCandidates } from "@/features/reports/api";
import type { ReportAnalysisComparisonCandidate, ReportAnalysisComparisonMetric, ReportAnalysisComparisonResult } from "@/features/reports/types";

const COMPARISON_METRICS = [
  { key: "avg_confidence", label: "평균 신뢰도", type: "confidence" },
  { key: "detection_count", label: "탐지 개수", type: "count" },
  { key: "max_confidence", label: "최고 신뢰도", type: "confidence" },
] as const;

function getJobId(candidate: ReportAnalysisComparisonCandidate) {
  return candidate.job_id ?? candidate.analysis_job_id ?? candidate.id;
}

function getJobStatus(candidate: ReportAnalysisComparisonCandidate) {
  return candidate.job_status ?? candidate.status ?? "-";
}

function getBadgeTone(value: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (["FAILED", "CRITICAL", "HIGH"].includes(value)) return "red";
  if (["QUEUED", "PROCESSING", "ANALYZING", "MEDIUM"].includes(value)) return "amber";
  if (["COMPLETED", "LOW"].includes(value)) return "green";
  return "slate";
}

function isCompletedJob(candidate: ReportAnalysisComparisonCandidate) {
  return getJobStatus(candidate) === "COMPLETED";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonMetric(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function toNumber(value: unknown): number | null {
  const parsedValue = parseJsonMetric(value);
  if (typeof parsedValue === "number" && Number.isFinite(parsedValue)) return parsedValue;
  if (typeof parsedValue === "string") {
    const normalized = parsedValue.trim().replace(/%$/, "");
    if (!normalized) return null;
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) return null;
    return parsedValue.trim().endsWith("%") ? numeric / 100 : numeric;
  }
  return null;
}

function normalizeJobId(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/^job[_-]?/i, "");
}

function getValueFromMetricItem(value: unknown): number | null {
  const parsedValue = parseJsonMetric(value);

  if (!isRecord(parsedValue)) {
    return toNumber(parsedValue);
  }

  return toNumber(
    parsedValue.value ??
      parsedValue.score ??
      parsedValue.confidence ??
      parsedValue.count ??
      parsedValue.metric_value
  );
}

function getMetricKeyFromEntry(entry: ReportAnalysisComparisonMetric) {
  const parsedValue = parseJsonMetric(entry.value);
  const parsedValues = parseJsonMetric(entry.values);
  const candidates = [entry.key, entry.name, entry.label];

  if (isRecord(parsedValue)) candidates.push(parsedValue.key as string, parsedValue.name as string, parsedValue.metric as string);
  if (isRecord(parsedValues)) candidates.push(parsedValues.key as string, parsedValues.name as string, parsedValues.metric as string);

  return COMPARISON_METRICS.find((metric) => candidates.includes(metric.key))?.key;
}

function getMetricPayload(metrics: ReportAnalysisComparisonResult["metrics"], metricKey: ComparisonMetricKey): unknown {
  if (!metrics) return null;

  if (Array.isArray(metrics)) {
    const entry = metrics.find((metric) => getMetricKeyFromEntry(metric) === metricKey);
    if (!entry) return null;

    const parsedValue = parseJsonMetric(entry.value);
    if (isRecord(parsedValue)) return parsedValue;

    const parsedValues = parseJsonMetric(entry.values);
    if (isRecord(parsedValues)) return { ...entry, values: parsedValues };

    return entry;
  }

  return parseJsonMetric(metrics[metricKey]);
}

function getMetricValues(payload: unknown, jobIds: string[]) {
  const parsedPayload = parseJsonMetric(payload);
  const source = isRecord(parsedPayload) ? parsedPayload : {};
  const rawValues = parseJsonMetric(source.values ?? source.job_values ?? source.jobs ?? source.value);

  const result = jobIds.reduce<Record<string, number | null>>((acc, jobId) => {
    acc[normalizeJobId(jobId)] = null;
    return acc;
  }, {});

  if (Array.isArray(rawValues)) {
    rawValues.forEach((item) => {
      if (!isRecord(item)) return;

      const jobId = normalizeJobId(
        item.job_id ??
          item.jobId ??
          item.analysis_job_id ??
          item.analysisJobId ??
          item.id
      );

      if (!jobId) return;

      result[jobId] = getValueFromMetricItem(item);
    });

    return result;
  }

  const valuesSource = isRecord(rawValues) ? rawValues : source;

  Object.entries(valuesSource).forEach(([rawJobId, rawValue]) => {
    const jobId = normalizeJobId(rawJobId);

    if (!jobId || !(jobId in result)) return;

    result[jobId] = getValueFromMetricItem(rawValue);
  });

  return result;
}

function getMetricDelta(payload: unknown, values: Record<string, number | null>) {
  const parsedPayload = parseJsonMetric(payload);
  const source = isRecord(parsedPayload) ? parsedPayload : {};
  const explicitDelta = toNumber(source.delta ?? source.diff ?? source.difference);
  if (explicitDelta !== null) return Math.abs(explicitDelta);

  const numericValues = Object.values(values).filter((value): value is number => value !== null);
  if (numericValues.length === 0) return 0;
  return Math.max(...numericValues) - Math.min(...numericValues);
}

function areMetricValuesSame(values: Record<string, number | null>) {
  const numericValues = Object.values(values).filter((value): value is number => value !== null);
  if (numericValues.length <= 1) return true;
  const first = numericValues[0];
  return numericValues.every((value) => Math.abs(value - first) < 0.000001);
}

function buildDisplayMetrics(result: ReportAnalysisComparisonResult | null, selectedIds: string[]) {
  if (!result) return [];

  const jobIds = (result.job_ids?.length ? result.job_ids.map(String) : selectedIds).filter(Boolean);
  return COMPARISON_METRICS.map((metric) => {
    const payload = getMetricPayload(result.metrics, metric.key);
    const values = getMetricValues(payload, jobIds);
    return {
      ...metric,
      values,
      delta: getMetricDelta(payload, values),
      allSame: areMetricValuesSame(values),
    };
  }).filter((metric) => Object.values(metric.values).some((value) => value !== null));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function ComparisonResultView({ result, selectedJobIds }: { result: ReportAnalysisComparisonResult; selectedJobIds: string[] }) {
  const metrics = buildDisplayMetrics(result, selectedJobIds);
  const jobIds = (result.job_ids?.length ? result.job_ids.map(String) : selectedJobIds)
    .map(normalizeJobId)
    .filter(Boolean);

  return <ComparisonResultPanel metrics={metrics} jobIds={jobIds} />;
}

function AnalysisComparisonsContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("report_id") ?? undefined;
  const selectedJobId = searchParams.get("selectedJobId") ?? undefined;
  const [candidates, setCandidates] = useState<ReportAnalysisComparisonCandidate[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [comparisonResult, setComparisonResult] = useState<ReportAnalysisComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonMessage, setComparisonMessage] = useState("");

  useEffect(() => {
    let disposed = false;

    async function loadCandidates() {
      setLoading(true);
      setErrorMessage("");

      try {
        const nextCandidates = await getAnalysisComparisonCandidates({ report_id: reportId, selectedJobId });
        if (disposed) return;
        setCandidates(nextCandidates);
        if (selectedJobId) {
          const selectedCandidate = nextCandidates.find((candidate) => String(getJobId(candidate)) === selectedJobId);
          if (selectedCandidate && isCompletedJob(selectedCandidate)) {
            setSelectedJobIds((current) => (current.includes(selectedJobId) ? current : [selectedJobId, ...current].slice(0, 5)));
          }
        }
      } catch {
        if (!disposed) {
          setCandidates([]);
          setErrorMessage("비교분석 후보를 불러오지 못했습니다.");
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    loadCandidates();
    return () => {
      disposed = true;
    };
  }, [reportId, selectedJobId]);

  const selectedCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const jobId = getJobId(candidate);
      return jobId !== undefined && selectedJobIds.includes(String(jobId));
    });
  }, [candidates, selectedJobIds]);

  function toggleJob(candidate: ReportAnalysisComparisonCandidate) {
    const jobId = getJobId(candidate);
    if (jobId === undefined || jobId === null) return;
    if (!isCompletedJob(candidate)) {
      setComparisonMessage("COMPLETED 상태의 job만 비교할 수 있습니다.");
      return;
    }
    const normalizedJobId = String(jobId);
    setComparisonMessage("");
    setComparisonResult(null);
    setSelectedJobIds((current) => {
      if (current.includes(normalizedJobId)) return current.filter((id) => id !== normalizedJobId);
      if (current.length >= 5) {
        setComparisonMessage("비교 대상은 최대 5개까지 선택할 수 있습니다.");
        return current;
      }
      return [...current, normalizedJobId];
    });
  }

  async function handleCreateComparison() {
    if (selectedJobIds.length < 2) return;
    setComparing(true);
    setComparisonMessage("");
    setComparisonResult(null);

    try {
      const result = await createAnalysisComparison(selectedJobIds);
      setComparisonResult(result);
    } catch {
      setComparisonMessage("비교분석을 실행하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setComparing(false);
    }
  }

  return (
    <RequireAuth>
      <AppLayout title="비교분석">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">비교분석</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {reportId ? "신고 기준 분석 job 후보를 비교합니다." : "분석 job을 선택해 비교 대상을 구성합니다."}
            </p>
          </div>
          <Link href={reportId ? "/reports/" + reportId : "/reports"} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50">
            돌아가기
          </Link>
        </section>

        <section className="mb-5 grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-black uppercase text-slate-400">report_id</p>
            <p className="mt-1 text-lg font-black text-slate-900">{reportId ?? "-"}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-black uppercase text-slate-400">selectedJobId</p>
            <p className="mt-1 text-lg font-black text-slate-900">{selectedJobId ?? "-"}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-black uppercase text-slate-400">선택된 job</p>
            <p className="mt-1 text-lg font-black text-slate-900">{selectedJobIds.length}개</p>
          </Card>
        </section>

        {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        <section className="grid gap-5 xl:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-black text-slate-950">후보 목록</h3>
            </div>
            {loading ? <p className="p-8 text-center text-sm font-bold text-slate-500">비교분석 후보를 불러오는 중입니다.</p> : null}
            {!loading && candidates.length === 0 ? <p className="p-8 text-center text-sm font-bold text-slate-500">비교 가능한 분석 후보가 없습니다.</p> : null}
            {!loading && candidates.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {candidates.map((candidate, index) => {
                  const jobId = getJobId(candidate);
                  const jobStatus = getJobStatus(candidate);
                  const selected = jobId !== undefined && selectedJobIds.includes(String(jobId));
                  return (
                    <li key={String(jobId ?? index)}>
                      <button type="button" onClick={() => toggleJob(candidate)} disabled={jobId === undefined || jobId === null || !isCompletedJob(candidate)} title={!isCompletedJob(candidate) ? "COMPLETED 상태의 job만 비교할 수 있습니다." : undefined} className="block w-full px-5 py-4 text-left transition hover:bg-slate-50 disabled:opacity-50">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-900">Job {jobId ?? "-"}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Report {candidate.report_id ?? reportId ?? "-"} · 첨부 {candidate.attachment_id ?? "-"}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">{candidate.engine_name ?? candidate.model_name ?? "분석 엔진 정보 없음"} · {formatDate(candidate.updated_at ?? candidate.created_at)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <Badge tone={getBadgeTone(jobStatus)}>{jobStatus}</Badge>
                            <Badge tone={getBadgeTone(candidate.risk_level ?? "")}>{candidate.risk_level ?? "위험도 없음"}</Badge>
                            {!isCompletedJob(candidate) ? <Badge tone="slate">선택 불가</Badge> : null}
                            {selected ? <Badge tone="blue">선택됨</Badge> : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-black text-slate-950">선택한 비교 대상</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">비교 API는 최소 2개 이상의 job 선택이 필요합니다.</p>
            <div className="mt-4 grid gap-2">
              {selectedCandidates.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">선택된 job이 없습니다.</p> : null}
              {selectedCandidates.map((candidate) => (
                <div key={String(getJobId(candidate))} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-sm font-black text-slate-900">Job {getJobId(candidate)}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs font-semibold text-slate-500 [overflow-wrap:anywhere] [word-break:keep-all]">{candidate.summary ?? "요약 없음"}</p>
                </div>
              ))}
            </div>
            {comparisonMessage ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-700">{comparisonMessage}</p> : null}
            <button type="button" onClick={handleCreateComparison} disabled={selectedJobIds.length < 2 || selectedJobIds.length > 5 || comparing} className="mt-4 h-10 w-full rounded-lg bg-slate-900 text-sm font-bold text-white disabled:opacity-50">
              {comparing ? "비교분석 중" : selectedJobIds.length < 2 ? "2개 이상 선택 필요" : "비교분석 실행"}
            </button>

            {comparisonResult ? (
              <ComparisonResultView result={comparisonResult} selectedJobIds={selectedJobIds} />
            ) : null}
          </Card>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}

export default function AnalysisComparisonsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm font-bold text-slate-500">비교분석 화면을 불러오는 중입니다.</p>}>
      <AnalysisComparisonsContent />
    </Suspense>
  );
}
