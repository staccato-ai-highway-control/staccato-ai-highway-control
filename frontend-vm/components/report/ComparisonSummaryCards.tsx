import { BarChart3, CircleCheckBig, Target, TrendingUp } from "lucide-react";
import type { DisplayComparisonMetric } from "./comparisonTypes";
import { formatComparisonValue } from "./comparisonTypes";

type ComparisonSummaryCardsProps = {
  metrics: DisplayComparisonMetric[];
  jobIds: string[];
};

function getMetric(metrics: DisplayComparisonMetric[], key: DisplayComparisonMetric["key"]) {
  return metrics.find((metric) => metric.key === key);
}

function getValues(metric?: DisplayComparisonMetric) {
  return metric ? Object.values(metric.values).filter((value): value is number => value !== null && Number.isFinite(value)) : [];
}

function getBestJob(metrics: DisplayComparisonMetric[], jobIds: string[]) {
  if (metrics.length === 0 || metrics.every((metric) => metric.allSame)) return "모든 Job 동일";

  const orderedKeys: DisplayComparisonMetric["key"][] = ["avg_confidence", "max_confidence", "detection_count"];
  const scoredJobs = jobIds.map((jobId) => ({
    jobId,
    values: orderedKeys.map((key) => getMetric(metrics, key)?.values[jobId] ?? Number.NEGATIVE_INFINITY),
  }));

  scoredJobs.sort((left, right) => {
    for (let index = 0; index < left.values.length; index += 1) {
      if (left.values[index] !== right.values[index]) return right.values[index] - left.values[index];
    }
    return 0;
  });

  return scoredJobs[0]?.values.some(Number.isFinite) ? `Job ${scoredJobs[0].jobId}` : "판정 데이터 없음";
}

export function ComparisonSummaryCards({ metrics, jobIds }: ComparisonSummaryCardsProps) {
  const averageMetric = getMetric(metrics, "avg_confidence");
  const detectionMetric = getMetric(metrics, "detection_count");
  const maxMetric = getMetric(metrics, "max_confidence");
  const averageValues = getValues(averageMetric);
  const detectionValues = getValues(detectionMetric);
  const maxValues = getValues(maxMetric);
  const averageConfidence = averageValues.length > 0 ? averageValues.reduce((sum, value) => sum + value, 0) / averageValues.length : null;
  const totalDetections = detectionValues.length > 0 ? detectionValues.reduce((sum, value) => sum + value, 0) : null;
  const maxConfidence = maxValues.length > 0 ? Math.max(...maxValues) : null;

  const cards = [
    { label: "평균 신뢰도", value: formatComparisonValue(averageConfidence, "confidence"), icon: TrendingUp, tone: "bg-sky-50 text-sky-700" },
    { label: "총 탐지 개수", value: formatComparisonValue(totalDetections, "count"), icon: BarChart3, tone: "bg-amber-50 text-amber-700" },
    { label: "최고 신뢰도", value: formatComparisonValue(maxConfidence, "confidence"), icon: Target, tone: "bg-red-50 text-red-700" },
    { label: "최고 성능 Job", value: getBestJob(metrics, jobIds), icon: CircleCheckBig, tone: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.tone}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-3 text-xs font-black text-slate-500">{card.label}</p>
            <p className="mt-1 truncate text-lg font-black text-slate-950" title={card.value}>{card.value}</p>
          </article>
        );
      })}
    </div>
  );
}
