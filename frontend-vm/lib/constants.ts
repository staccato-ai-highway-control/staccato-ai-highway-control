/**
 * 파일 역할: constants 관련 처리를 여러 기능에서 재사용할 수 있도록 제공하는 공통 유틸리티입니다.
 * 유지보수 참고: 호출 범위가 넓으므로 입력 경계값과 브라우저/서버 실행 환경 차이를 고려해 동작을 변경해야 합니다.
 *
 * 서버에서는 Flask 절대 주소를, 브라우저에서는 /backend-api를 사용합니다.
 * 브라우저 요청은 next.config.js rewrite를 거쳐 Flask로 전달됩니다.
 */
export const SERVICE_NAME = "STACCATO";

// 코드 설명: MVP_DESCRIPTION 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const MVP_DESCRIPTION =
  "AI 기반 고속도로 정차 차량 탐지 및 교통 관제 시스템";

// 코드 설명: SERVICE_SUBTITLE 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const SERVICE_SUBTITLE = "AI Traffic Safety Control System";

// 코드 설명: DIRECT_API_BASE_URL 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const DIRECT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://192.168.0.187:5000";
// 코드 설명: API_PROXY_PATH 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const API_PROXY_PATH = process.env.NEXT_PUBLIC_API_PROXY_PATH ?? "/backend-api";

// window 존재 여부로 서버 실행과 브라우저 실행을 구분해 API 진입점을 선택합니다.
export const API_BASE_URL =
  typeof window === "undefined" ? DIRECT_API_BASE_URL : API_PROXY_PATH;
