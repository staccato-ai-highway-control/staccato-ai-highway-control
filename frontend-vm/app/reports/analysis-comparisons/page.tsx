/**
 * 파일 역할: 보고서 / analysis-comparisons 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Suspense, useEffect, useMemo, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useSearchParams } from "next/navigation";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/components/report/ComparisonResultPanel 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ComparisonResultPanel } from "@/components/report/ComparisonResultPanel";
// 코드 설명: @/components/report/comparisonTypes 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ComparisonMetricKey, ComparisonMetricType, DisplayComparisonMetric } from "@/components/report/comparisonTypes";
// 코드 설명: @/features/reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { createAnalysisComparison, getAnalysisComparisonCandidates } from "@/features/reports/api";
// 코드 설명: @/features/reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ReportAnalysisComparisonCandidate, ReportAnalysisComparisonMetric, ReportAnalysisComparisonResult } from "@/features/reports/types";

// 코드 설명: COMPARISON_METRICS 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const COMPARISON_METRICS = [
  { key: "avg_confidence", label: "평균 신뢰도", type: "confidence" },
  { key: "detection_count", label: "탐지 개수", type: "count" },
  { key: "max_confidence", label: "최고 신뢰도", type: "confidence" },
] as const;

// 코드 설명: getJobId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getJobId(candidate: ReportAnalysisComparisonCandidate) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: candidate.job_id ?? candidate.analysis_job_id ?? candidate.id
  return candidate.job_id ?? candidate.analysis_job_id ?? candidate.id;
}

// 코드 설명: getJobStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getJobStatus(candidate: ReportAnalysisComparisonCandidate) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: candidate.job_status ?? candidate.status ?? "-"
  return candidate.job_status ?? candidate.status ?? "-";
}

// 코드 설명: getBadgeTone 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getBadgeTone(value: string): "slate" | "blue" | "green" | "amber" | "red" {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["FAILED", "CRITICAL", "HIGH"].includes(value)
  if (["FAILED", "CRITICAL", "HIGH"].includes(value)) return "red";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["QUEUED", "PROCESSING", "ANALYZING", "MEDIUM"].includes(value)
  if (["QUEUED", "PROCESSING", "ANALYZING", "MEDIUM"].includes(value)) return "amber";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["COMPLETED", "LOW"].includes(value)
  if (["COMPLETED", "LOW"].includes(value)) return "green";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "slate"
  return "slate";
}

// 코드 설명: isCompletedJob 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isCompletedJob(candidate: ReportAnalysisComparisonCandidate) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getJobStatus(candidate) === "COMPLETED"
  return getJobStatus(candidate) === "COMPLETED";
}

// 코드 설명: isRecord 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isRecord(value: unknown): value is Record<string, unknown> {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: typeof value === "object" && value !== null && !Array.isArray(value)
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 코드 설명: parseJsonMetric 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function parseJsonMetric(value: unknown): unknown {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof value !== "string"
  if (typeof value !== "string") return value;

  // 코드 설명: trimmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const trimmed = value.trim();
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return value;

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: JSON.parse(trimmed)
    return JSON.parse(trimmed);
  } catch {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: value
    return value;
  }
}

// 코드 설명: toNumber 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function toNumber(value: unknown): number | null {
  // 코드 설명: parsedValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const parsedValue = parseJsonMetric(value);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof parsedValue === "number" && Number.isFinite(parsedValue)
  if (typeof parsedValue === "number" && Number.isFinite(parsedValue)) return parsedValue;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof parsedValue === "string"
  if (typeof parsedValue === "string") {
    // 코드 설명: normalized 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const normalized = parsedValue.trim().replace(/%$/, "");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !normalized
    if (!normalized) return null;
    // 코드 설명: numeric 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const numeric = Number(normalized);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !Number.isFinite(numeric)
    if (!Number.isFinite(numeric)) return null;
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: parsedValue.trim().endsWith("%") ? numeric / 100 : numeric
    return parsedValue.trim().endsWith("%") ? numeric / 100 : numeric;
  }
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
  return null;
}

// 코드 설명: normalizeJobId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeJobId(value: unknown) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value === null || value === undefined
  if (value === null || value === undefined) return "";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String(value).replace(/^job[_-]?/i, "")
  return String(value).replace(/^job[_-]?/i, "");
}

// 코드 설명: getValueFromMetricItem 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getValueFromMetricItem(value: unknown): number | null {
  // 코드 설명: parsedValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const parsedValue = parseJsonMetric(value);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isRecord(parsedValue)
  if (!isRecord(parsedValue)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: toNumber(parsedValue)
    return toNumber(parsedValue);
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: toNumber( parsedValue.value ?? parsedValue.score ?? parsedValue.confide…
  return toNumber(
    parsedValue.value ??
      parsedValue.score ??
      parsedValue.confidence ??
      parsedValue.count ??
      parsedValue.metric_value
  );
}

// 코드 설명: getMetricKeyFromEntry 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getMetricKeyFromEntry(entry: ReportAnalysisComparisonMetric) {
  // 코드 설명: parsedValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const parsedValue = parseJsonMetric(entry.value);
  // 코드 설명: parsedValues 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const parsedValues = parseJsonMetric(entry.values);
  // 코드 설명: candidates 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const candidates = [entry.key, entry.name, entry.label];

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isRecord(parsedValue)
  if (isRecord(parsedValue)) candidates.push(parsedValue.key as string, parsedValue.name as string, parsedValue.metric as string);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isRecord(parsedValues)
  if (isRecord(parsedValues)) candidates.push(parsedValues.key as string, parsedValues.name as string, parsedValues.metric as string);

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: COMPARISON_METRICS.find((metric) => candidates.includes(metric.key))?.k…
  return COMPARISON_METRICS.find((metric) => candidates.includes(metric.key))?.key;
}

// 코드 설명: getMetricPayload 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getMetricPayload(metrics: ReportAnalysisComparisonResult["metrics"], metricKey: ComparisonMetricKey): unknown {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !metrics
  if (!metrics) return null;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(metrics)
  if (Array.isArray(metrics)) {
    // 코드 설명: entry 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const entry = metrics.find((metric) => getMetricKeyFromEntry(metric) === metricKey);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !entry
    if (!entry) return null;

    // 코드 설명: parsedValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const parsedValue = parseJsonMetric(entry.value);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isRecord(parsedValue)
    if (isRecord(parsedValue)) return parsedValue;

    // 코드 설명: parsedValues 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const parsedValues = parseJsonMetric(entry.values);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isRecord(parsedValues)
    if (isRecord(parsedValues)) return { ...entry, values: parsedValues };

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: entry
    return entry;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: parseJsonMetric(metrics[metricKey])
  return parseJsonMetric(metrics[metricKey]);
}

// 코드 설명: getMetricValues 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getMetricValues(payload: unknown, jobIds: string[]) {
  // 코드 설명: parsedPayload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const parsedPayload = parseJsonMetric(payload);
  // 코드 설명: source 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const source = isRecord(parsedPayload) ? parsedPayload : {};
  // 코드 설명: rawValues 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const rawValues = parseJsonMetric(source.values ?? source.job_values ?? source.jobs ?? source.value);

  // 코드 설명: result 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const result = jobIds.reduce<Record<string, number | null>>((acc, jobId) => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: acc[normalizeJobId(jobId)] = null;
    acc[normalizeJobId(jobId)] = null;
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: acc
    return acc;
  }, {});

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(rawValues)
  if (Array.isArray(rawValues)) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: rawValues.forEach((item) => { if (!isRecord(item)) return; const jobId …
    rawValues.forEach((item) => {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isRecord(item)
      if (!isRecord(item)) return;

      // 코드 설명: jobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const jobId = normalizeJobId(
        item.job_id ??
          item.jobId ??
          item.analysis_job_id ??
          item.analysisJobId ??
          item.id
      );

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !jobId
      if (!jobId) return;

      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: result[jobId] = getValueFromMetricItem(item);
      result[jobId] = getValueFromMetricItem(item);
    });

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: result
    return result;
  }

  // 코드 설명: valuesSource 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const valuesSource = isRecord(rawValues) ? rawValues : source;

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: Object.entries(valuesSource).forEach(([rawJobId, rawValue]) => { const …
  Object.entries(valuesSource).forEach(([rawJobId, rawValue]) => {
    // 코드 설명: jobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const jobId = normalizeJobId(rawJobId);

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !jobId || !(jobId in result)
    if (!jobId || !(jobId in result)) return;

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: result[jobId] = getValueFromMetricItem(rawValue);
    result[jobId] = getValueFromMetricItem(rawValue);
  });

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: result
  return result;
}

// 코드 설명: getMetricDelta 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getMetricDelta(payload: unknown, values: Record<string, number | null>) {
  // 코드 설명: parsedPayload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const parsedPayload = parseJsonMetric(payload);
  // 코드 설명: source 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const source = isRecord(parsedPayload) ? parsedPayload : {};
  // 코드 설명: explicitDelta 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const explicitDelta = toNumber(source.delta ?? source.diff ?? source.difference);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: explicitDelta !== null
  if (explicitDelta !== null) return Math.abs(explicitDelta);

  // 코드 설명: numericValues 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const numericValues = Object.values(values).filter((value): value is number => value !== null);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: numericValues.length === 0
  if (numericValues.length === 0) return 0;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Math.max(...numericValues) - Math.min(...numericValues)
  return Math.max(...numericValues) - Math.min(...numericValues);
}

// 코드 설명: areMetricValuesSame 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function areMetricValuesSame(values: Record<string, number | null>) {
  // 코드 설명: numericValues 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const numericValues = Object.values(values).filter((value): value is number => value !== null);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: numericValues.length <= 1
  if (numericValues.length <= 1) return true;
  // 코드 설명: first 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const first = numericValues[0];
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: numericValues.every((value) => Math.abs(value - first) < 0.000001)
  return numericValues.every((value) => Math.abs(value - first) < 0.000001);
}

// 코드 설명: buildDisplayMetrics 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function buildDisplayMetrics(result: ReportAnalysisComparisonResult | null, selectedIds: string[]) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !result
  if (!result) return [];

  // 코드 설명: jobIds 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const jobIds = (result.job_ids?.length ? result.job_ids.map(String) : selectedIds).filter(Boolean);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: COMPARISON_METRICS.map((metric) => { const payload = getMetricPayload(r…
  return COMPARISON_METRICS.map((metric) => {
    // 코드 설명: payload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const payload = getMetricPayload(result.metrics, metric.key);
    // 코드 설명: values 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const values = getMetricValues(payload, jobIds);
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { ...metric, values, delta: getMetricDelta(payload, values), allSame: a…
    return {
      ...metric,
      values,
      delta: getMetricDelta(payload, values),
      allSame: areMetricValuesSame(values),
    };
  }).filter((metric) => Object.values(metric.values).some((value) => value !== null));
}

// 코드 설명: formatDate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatDate(value?: string | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "-";
  // 코드 설명: date 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const date = new Date(value);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Number.isNaN(date.getTime())
  if (Number.isNaN(date.getTime())) return value;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", d…
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

// 코드 설명: ComparisonResultView 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function ComparisonResultView({ result, selectedJobIds }: { result: ReportAnalysisComparisonResult; selectedJobIds: string[] }) {
  // 코드 설명: metrics 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const metrics = buildDisplayMetrics(result, selectedJobIds);
  // 코드 설명: jobIds 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const jobIds = (result.job_ids?.length ? result.job_ids.map(String) : selectedJobIds)
    .map(normalizeJobId)
    .filter(Boolean);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return <ComparisonResultPanel metrics={metrics} jobIds={jobIds} />;
}

// 코드 설명: AnalysisComparisonsContent 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function AnalysisComparisonsContent() {
  // 코드 설명: searchParams 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const searchParams = useSearchParams();
  // 코드 설명: reportId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const reportId = searchParams.get("report_id") ?? undefined;
  // 코드 설명: selectedJobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const selectedJobId = searchParams.get("selectedJobId") ?? undefined;
  // 코드 설명: selectedJobIdsParam 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const selectedJobIdsParam = searchParams.get("selectedJobIds") ?? "";
  // 코드 설명: preselectedJobIds 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const preselectedJobIds = useMemo(
    () => selectedJobIdsParam.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 5),
    [selectedJobIdsParam]
  );
  // 코드 설명: [candidates, setCandidates] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [candidates, setCandidates] = useState<ReportAnalysisComparisonCandidate[]>([]);
  // 코드 설명: [selectedJobIds, setSelectedJobIds] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: [comparisonResult, setComparisonResult] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [comparisonResult, setComparisonResult] = useState<ReportAnalysisComparisonResult | null>(null);
  // 코드 설명: [comparing, setComparing] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [comparing, setComparing] = useState(false);
  // 코드 설명: [comparisonMessage, setComparisonMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [comparisonMessage, setComparisonMessage] = useState("");

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: disposed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let disposed = false;

    // 코드 설명: loadCandidates 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function loadCandidates() {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(true);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("");

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: nextCandidates 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const nextCandidates = await getAnalysisComparisonCandidates({ report_id: reportId, selectedJobId });
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: disposed
        if (disposed) return;
        // 코드 설명: setCandidates 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setCandidates(nextCandidates);
        // 코드 설명: requestedJobIds 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const requestedJobIds = preselectedJobIds.length > 0
          ? preselectedJobIds
          : selectedJobId
            ? [selectedJobId]
            : [];
        // 코드 설명: availableJobIds 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const availableJobIds = requestedJobIds.filter((jobId) => nextCandidates.some((candidate) => (
          String(getJobId(candidate)) === jobId && isCompletedJob(candidate)
        )));
        // 코드 설명: setSelectedJobIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setSelectedJobIds(availableJobIds);
      } catch {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) {
          // 코드 설명: setCandidates 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setCandidates([]);
          // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setErrorMessage("비교분석 후보를 불러오지 못했습니다.");
        }
      } finally {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) setLoading(false);
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadCandidates();
    loadCandidates();
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { disposed = true; }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: disposed = true;
      disposed = true;
    };
  }, [preselectedJobIds, reportId, selectedJobId]);

  // 코드 설명: selectedCandidates 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const selectedCandidates = useMemo(() => {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: candidates.filter((candidate) => { const jobId = getJobId(candidate); r…
    return candidates.filter((candidate) => {
      // 코드 설명: jobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const jobId = getJobId(candidate);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: jobId !== undefined && selectedJobIds.includes(String(jobId))
      return jobId !== undefined && selectedJobIds.includes(String(jobId));
    });
  }, [candidates, selectedJobIds]);

  // 코드 설명: toggleJob 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function toggleJob(candidate: ReportAnalysisComparisonCandidate) {
    // 코드 설명: jobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const jobId = getJobId(candidate);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: jobId === undefined || jobId === null
    if (jobId === undefined || jobId === null) return;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isCompletedJob(candidate)
    if (!isCompletedJob(candidate)) {
      // 코드 설명: setComparisonMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setComparisonMessage("COMPLETED 상태의 job만 비교할 수 있습니다.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }
    // 코드 설명: normalizedJobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const normalizedJobId = String(jobId);
    // 코드 설명: setComparisonMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setComparisonMessage("");
    // 코드 설명: setComparisonResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setComparisonResult(null);
    // 코드 설명: setSelectedJobIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedJobIds((current) => {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: current.includes(normalizedJobId)
      if (current.includes(normalizedJobId)) return current.filter((id) => id !== normalizedJobId);
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: current.length >= 5
      if (current.length >= 5) {
        // 코드 설명: setComparisonMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setComparisonMessage("비교 대상은 최대 5개까지 선택할 수 있습니다.");
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: current
        return current;
      }
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: [...current, normalizedJobId]
      return [...current, normalizedJobId];
    });
  }

  // 코드 설명: handleCreateComparison 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleCreateComparison() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: selectedJobIds.length < 2
    if (selectedJobIds.length < 2) return;
    // 코드 설명: setComparing 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setComparing(true);
    // 코드 설명: setComparisonMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setComparisonMessage("");
    // 코드 설명: setComparisonResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setComparisonResult(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: result 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const result = await createAnalysisComparison(selectedJobIds);
      // 코드 설명: setComparisonResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setComparisonResult(result);
    } catch {
      // 코드 설명: setComparisonMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setComparisonMessage("비교분석을 실행하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 코드 설명: setComparing 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setComparing(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
                  // 코드 설명: jobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const jobId = getJobId(candidate);
                  // 코드 설명: jobStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const jobStatus = getJobStatus(candidate);
                  // 코드 설명: selected 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const selected = jobId !== undefined && selectedJobIds.includes(String(jobId));
                  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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

// 코드 설명: AnalysisComparisonsPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function AnalysisComparisonsPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm font-bold text-slate-500">비교분석 화면을 불러오는 중입니다.</p>}>
      <AnalysisComparisonsContent />
    </Suspense>
  );
}
