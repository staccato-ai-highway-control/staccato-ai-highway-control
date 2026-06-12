/**
 * 파일 역할: 보고서 영역에서 사용하는 ComparisonResultTable UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { DisplayComparisonMetric } from "./comparisonTypes";
// 코드 설명: ./comparisonTypes 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { formatComparisonValue } from "./comparisonTypes";

// 코드 설명: ComparisonResultTableProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ComparisonResultTableProps = {
  metrics: DisplayComparisonMetric[];
  jobIds: string[];
};

// 코드 설명: ComparisonResultTable 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ComparisonResultTable({ metrics, jobIds }: ComparisonResultTableProps) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
