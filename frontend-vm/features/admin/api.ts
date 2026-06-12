/**
 * 파일 역할: 관리자 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient } from "@/lib/apiClient";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AdminUser, SignupRequestApiItem, SignupRequestStatus } from "./types";

// 코드 설명: FlexibleListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type FlexibleListResponse<T> = {
  data?: T[];
  users?: T[];
  signup_requests?: T[];
  message?: string;
};

// 코드 설명: normalizeList 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeList<T>(response: T[] | FlexibleListResponse<T>) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response)
  if (Array.isArray(response)) return response;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: response.data ?? response.users ?? response.signup_requests ?? []
  return response.data ?? response.users ?? response.signup_requests ?? [];
}

// 코드 설명: getAdminUsers 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getAdminUsers() {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<AdminUser[] | FlexibleListResponse<AdminUser>>("/auth/users");
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeList(response)
  return normalizeList(response);
}

// 코드 설명: getSignupRequests 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getSignupRequests(status: SignupRequestStatus | "ALL" = "REQUESTED") {
  // 코드 설명: query 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const query = status === "ALL" ? "" : `?status=${encodeURIComponent(status)}`;
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<SignupRequestApiItem[] | FlexibleListResponse<SignupRequestApiItem>>(`/auth/signup-requests${query}`);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeList(response)
  return normalizeList(response);
}

// 코드 설명: approveSignupRequest 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function approveSignupRequest(signupRequestId: number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient(`/auth/signup-requests/${signupRequestId}/approve`, { method:…
  return apiClient(`/auth/signup-requests/${signupRequestId}/approve`, { method: "POST" });
}

// 코드 설명: rejectSignupRequest 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function rejectSignupRequest(signupRequestId: number, rejectReason = "관리자 거절") {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient(`/auth/signup-requests/${signupRequestId}/reject`, { method: …
  return apiClient(`/auth/signup-requests/${signupRequestId}/reject`, {
    method: "POST",
    body: { reject_reason: rejectReason },
  });
}
