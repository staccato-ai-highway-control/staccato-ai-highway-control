/**
 * 파일 역할: format 관련 처리를 여러 기능에서 재사용할 수 있도록 제공하는 공통 유틸리티입니다.
 * 유지보수 참고: 호출 범위가 넓으므로 입력 경계값과 브라우저/서버 실행 환경 차이를 고려해 동작을 변경해야 합니다.
 */
export function formatPercent(value: number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${value.toFixed(1)}%`
  return `${value.toFixed(1)}%`;
}

// 코드 설명: formatConfidence 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function formatConfidence(value: number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${Math.round(value * 100)}%`
  return `${Math.round(value * 100)}%`;
}

// 코드 설명: formatSeconds 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function formatSeconds(value: number) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value < 60
  if (value < 60) return `${value}초`;

  // 코드 설명: minutes 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const minutes = Math.floor(value / 60);
  // 코드 설명: seconds 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const seconds = value % 60;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: seconds ? `${minutes}분 ${seconds}초` : `${minutes}분`
  return seconds ? `${minutes}분 ${seconds}초` : `${minutes}분`;
}
