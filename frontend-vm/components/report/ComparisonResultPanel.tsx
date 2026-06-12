/**
 * 파일 역할: 보고서 영역에서 사용하는 ComparisonResultPanel UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { DisplayComparisonMetric } from "./comparisonTypes";
// 코드 설명: ./ComparisonMetricChart 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ComparisonMetricChart } from "./ComparisonMetricChart";
// 코드 설명: ./ComparisonResultTable 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ComparisonResultTable } from "./ComparisonResultTable";
// 코드 설명: ./ComparisonSummaryCards 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ComparisonSummaryCards } from "./ComparisonSummaryCards";

// 코드 설명: ComparisonResultPanelProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ComparisonResultPanelProps = {
  metrics: DisplayComparisonMetric[];
  jobIds: string[];
};

// 코드 설명: ComparisonResultPanel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ComparisonResultPanel({ metrics, jobIds }: ComparisonResultPanelProps) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: metrics.length === 0
  if (metrics.length === 0) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-500">표시할 지표가 없습니다.</p>;
  }

  // 코드 설명: allSame 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const allSame = metrics.every((metric) => metric.allSame);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
