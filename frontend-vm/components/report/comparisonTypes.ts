export type ComparisonMetricKey = "avg_confidence" | "detection_count" | "max_confidence";
export type ComparisonMetricType = "confidence" | "count";

export interface DisplayComparisonMetric {
  key: ComparisonMetricKey;
  label: string;
  type: ComparisonMetricType;
  values: Record<string, number | null>;
  delta: number;
  allSame: boolean;
}

export function formatComparisonValue(value: number | null, type: ComparisonMetricType) {
  if (value === null || !Number.isFinite(value)) return "-";
  if (type === "count") return `${Math.round(value).toLocaleString("ko-KR")}건`;
  return `${(value * 100).toFixed(2)}%`;
}
