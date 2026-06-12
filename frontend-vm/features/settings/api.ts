/**
 * 파일 역할: 설정 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient } from "@/lib/apiClient";

// 코드 설명: getHealth 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getHealth() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient("/health", { auth: false })
  return apiClient("/health", { auth: false });
}

// 코드 설명: getPublicConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getPublicConfig() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<{ kakaoMapJsKey?: string; data?: { kakaoMapJsKey?: string } }…
  return apiClient<{ kakaoMapJsKey?: string; data?: { kakaoMapJsKey?: string } }>("/api/config/public", { auth: false });
}
