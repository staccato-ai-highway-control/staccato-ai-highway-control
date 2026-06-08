import type { DisplayComparisonMetric } from "./comparisonTypes";
import { ComparisonMetricChart } from "./ComparisonMetricChart";
import { ComparisonResultTable } from "./ComparisonResultTable";
import { ComparisonSummaryCards } from "./ComparisonSummaryCards";

type ComparisonResultPanelProps = {
  metrics: DisplayComparisonMetric[];
  jobIds: string[];
};

export function ComparisonResultPanel({ metrics, jobIds }: ComparisonResultPanelProps) {
  if (metrics.length === 0) {
    return <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-500">표시할 지표가 없습니다.</p>;
  }

  const allSame = metrics.every((metric) => metric.allSame);

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="text-base font-black text-slate-900">비교 결과</h4>
          <p className="mt-1 text-xs font-semibold text-slate-500">선택된 {jobIds.length}개 Job의 핵심 지표를 비교합니다.</p>
        </div>
        {allSame ? <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">모든 Job 주요 지표 동일</span> : null}
      </div>

      <div className="mt-4 grid gap-4">
        <ComparisonSummaryCards metrics={metrics} jobIds={jobIds} />
        <div className="overflow-x-auto pb-1">
          <ComparisonMetricChart metrics={metrics} jobIds={jobIds} />
        </div>
        <ComparisonResultTable metrics={metrics} jobIds={jobIds} />
      </div>
    </div>
  );
}
