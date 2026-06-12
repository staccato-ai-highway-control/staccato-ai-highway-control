/**
 * 파일 역할: utils 관련 처리를 여러 기능에서 재사용할 수 있도록 제공하는 공통 유틸리티입니다.
 * 유지보수 참고: 호출 범위가 넓으므로 입력 경계값과 브라우저/서버 실행 환경 차이를 고려해 동작을 변경해야 합니다.
 */
export function cn(...values: Array<string | false | null | undefined>) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: values.filter(Boolean).join(" ")
  return values.filter(Boolean).join(" ");
}

