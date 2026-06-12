/**
 * 파일 역할: dateTime 관련 처리를 여러 기능에서 재사용할 수 있도록 제공하는 공통 유틸리티입니다.
 * 유지보수 참고: 호출 범위가 넓으므로 입력 경계값과 브라우저/서버 실행 환경 차이를 고려해 동작을 변경해야 합니다.
 */
const TIMEZONE_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:\d{2})$/i;

// 코드 설명: normalizeUtcTimestamp 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeUtcTimestamp(value: string) {
  // 코드 설명: trimmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const trimmed = value.trim();
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !trimmed
  if (!trimmed) return "";

  // Backend/AI timestamps are treated as UTC when timezone is omitted.
  // Example: 2026-06-04T12:22:37 -> 2026-06-04T12:22:37Z
  if (TIMEZONE_OFFSET_PATTERN.test(trimmed)) return trimmed;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${trimmed}Z`
  return `${trimmed}Z`;
}

// 코드 설명: formatKstDateTime 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function formatKstDateTime(value?: string | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "-";

  // 코드 설명: date 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const date = new Date(normalizeUtcTimestamp(value));
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Number.isNaN(date.getTime())
  if (Number.isNaN(date.getTime())) return "-";

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numer…
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

// 코드 설명: formatKstDateTimeShort 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function formatKstDateTimeShort(value?: string | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "-";

  // 코드 설명: date 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const date = new Date(normalizeUtcTimestamp(value));
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Number.isNaN(date.getTime())
  if (Number.isNaN(date.getTime())) return "-";

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-di…
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
