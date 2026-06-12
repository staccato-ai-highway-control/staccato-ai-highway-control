/**
 * 파일 역할: 보고서 영역에서 사용하는 ComparisonSummaryCards UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import { BarChart3, CircleCheckBig, Target, TrendingUp } from "lucide-react";
// 코드 설명: ./comparisonTypes 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { DisplayComparisonMetric } from "./comparisonTypes";
// 코드 설명: ./comparisonTypes 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { formatComparisonValue } from "./comparisonTypes";

// 코드 설명: ComparisonSummaryCardsProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ComparisonSummaryCardsProps = {
  metrics: DisplayComparisonMetric[];
  jobIds: string[];
};

// 코드 설명: getMetric 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getMetric(metrics: DisplayComparisonMetric[], key: DisplayComparisonMetric["key"]) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: metrics.find((metric) => metric.key === key)
  return metrics.find((metric) => metric.key === key);
}

// 코드 설명: getValues 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getValues(metric?: DisplayComparisonMetric) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: metric ? Object.values(metric.values).filter((value): value is number =…
  return metric ? Object.values(metric.values).filter((value): value is number => value !== null && Number.isFinite(value)) : [];
}

// 코드 설명: getBestJob 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getBestJob(metrics: DisplayComparisonMetric[], jobIds: string[]) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: metrics.length === 0 || metrics.every((metric) => metric.allSame)
  if (metrics.length === 0 || metrics.every((metric) => metric.allSame)) return "모든 Job 동일";

  // 코드 설명: orderedKeys 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const orderedKeys: DisplayComparisonMetric["key"][] = ["avg_confidence", "max_confidence", "detection_count"];
  // 코드 설명: scoredJobs 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const scoredJobs = jobIds.map((jobId) => ({
    jobId,
    values: orderedKeys.map((key) => getMetric(metrics, key)?.values[jobId] ?? Number.NEGATIVE_INFINITY),
  }));

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: scoredJobs.sort((left, right) => { for (let index = 0; index < left.val…
  scoredJobs.sort((left, right) => {
    // 코드 설명: 목록 또는 조건을 순회하면서 각 항목에 같은 처리 규칙을 적용합니다.
    for (let index = 0; index < left.values.length; index += 1) {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: left.values[index] !== right.values[index]
      if (left.values[index] !== right.values[index]) return right.values[index] - left.values[index];
    }
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 0
    return 0;
  });

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: scoredJobs[0]?.values.some(Number.isFinite) ? `Job ${scoredJobs[0].jobI…
  return scoredJobs[0]?.values.some(Number.isFinite) ? `Job ${scoredJobs[0].jobId}` : "판정 데이터 없음";
}

// 코드 설명: ComparisonSummaryCards 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ComparisonSummaryCards({ metrics, jobIds }: ComparisonSummaryCardsProps) {
  // 코드 설명: averageMetric 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const averageMetric = getMetric(metrics, "avg_confidence");
  // 코드 설명: detectionMetric 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const detectionMetric = getMetric(metrics, "detection_count");
  // 코드 설명: maxMetric 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const maxMetric = getMetric(metrics, "max_confidence");
  // 코드 설명: averageValues 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const averageValues = getValues(averageMetric);
  // 코드 설명: detectionValues 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const detectionValues = getValues(detectionMetric);
  // 코드 설명: maxValues 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const maxValues = getValues(maxMetric);
  // 코드 설명: averageConfidence 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const averageConfidence = averageValues.length > 0 ? averageValues.reduce((sum, value) => sum + value, 0) / averageValues.length : null;
  // 코드 설명: totalDetections 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const totalDetections = detectionValues.length > 0 ? detectionValues.reduce((sum, value) => sum + value, 0) : null;
  // 코드 설명: maxConfidence 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const maxConfidence = maxValues.length > 0 ? Math.max(...maxValues) : null;

  // 코드 설명: cards 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const cards = [
    { label: "평균 신뢰도", value: formatComparisonValue(averageConfidence, "confidence"), icon: TrendingUp, tone: "bg-sky-50 text-sky-700" },
    { label: "총 탐지 개수", value: formatComparisonValue(totalDetections, "count"), icon: BarChart3, tone: "bg-amber-50 text-amber-700" },
    { label: "최고 신뢰도", value: formatComparisonValue(maxConfidence, "confidence"), icon: Target, tone: "bg-red-50 text-red-700" },
    { label: "최고 성능 Job", value: getBestJob(metrics, jobIds), icon: CircleCheckBig, tone: "bg-emerald-50 text-emerald-700" },
  ];

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        // 코드 설명: Icon 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const Icon = card.icon;
        // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
