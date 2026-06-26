import type { DisplayComparisonMetric } from "./comparisonTypes";
import { formatComparisonValue } from "./comparisonTypes";

type ComparisonResultTableProps = {
  metrics: DisplayComparisonMetric[];
  jobIds: string[];
};

export function ComparisonResultTable({ metrics, jobIds }: ComparisonResultTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h5 className="text-sm font-black text-slate-900">상세 비교 테이블</h5>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="whitespace-nowrap px-3 py-3 text-left text-xs font-black text-slate-500">지표</th>
              {jobIds.map((jobId) => <th key={jobId} scope="col" className="whitespace-nowrap px-3 py-3 text-left text-xs font-black text-slate-500">Job {jobId}</th>)}
              <th scope="col" className="whitespace-nowrap px-3 py-3 text-left text-xs font-black text-slate-500">차이</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {metrics.map((metric) => (
              <tr key={metric.key}>
                <th scope="row" className="whitespace-nowrap px-3 py-3 text-left text-sm font-black text-slate-700">{metric.label}</th>
                {jobIds.map((jobId) => <td key={`${metric.key}-${jobId}`} className="whitespace-nowrap px-3 py-3 font-bold text-slate-900">{formatComparisonValue(metric.values[jobId] ?? null, metric.type)}</td>)}
                <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-900">{formatComparisonValue(metric.delta, metric.type)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
