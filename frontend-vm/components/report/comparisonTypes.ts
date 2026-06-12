/**
 * 파일 역할: 보고서 영역에서 사용하는 comparisonTypes UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
export type ComparisonMetricKey = "avg_confidence" | "detection_count" | "max_confidence";
// 코드 설명: ComparisonMetricType 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ComparisonMetricType = "confidence" | "count";

// 코드 설명: DisplayComparisonMetric 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface DisplayComparisonMetric {
  // 코드 설명: key 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  key: ComparisonMetricKey;
  // 코드 설명: label 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  label: string;
  // 코드 설명: type 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  type: ComparisonMetricType;
  // 코드 설명: values 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  values: Record<string, number | null>;
  // 코드 설명: delta 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  delta: number;
  // 코드 설명: allSame 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  allSame: boolean;
}

// 코드 설명: formatComparisonValue 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function formatComparisonValue(value: number | null, type: ComparisonMetricType) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value === null || !Number.isFinite(value)
  if (value === null || !Number.isFinite(value)) return "-";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: type === "count"
  if (type === "count") return `${Math.round(value).toLocaleString("ko-KR")}건`;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${(value * 100).toFixed(2)}%`
  return `${(value * 100).toFixed(2)}%`;
}
