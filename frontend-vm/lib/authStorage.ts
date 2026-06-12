/**
 * 파일 역할: authStorage 관련 처리를 여러 기능에서 재사용할 수 있도록 제공하는 공통 유틸리티입니다.
 * 유지보수 참고: 호출 범위가 넓으므로 입력 경계값과 브라우저/서버 실행 환경 차이를 고려해 동작을 변경해야 합니다.
 *
 * 로그인 응답의 accessToken과 사용자 정보를 localStorage에 보관합니다.
 * apiClient가 토큰을 읽어 Authorization Bearer 헤더에 첨부하며 실제 권한은 백엔드가 검증합니다.
 */
import type { AuthResponse, AuthUser } from "@/features/auth/types";

// 코드 설명: ACCESS_TOKEN_KEY 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const ACCESS_TOKEN_KEY = "accessToken";
// 코드 설명: AUTH_USER_KEY 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const AUTH_USER_KEY = "authUser";

// Next.js 서버 렌더링에는 localStorage가 없으므로 브라우저에서만 접근합니다.
function canUseStorage() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: typeof window !== "undefined"
  return typeof window !== "undefined";
}

// 코드 설명: getStoredAccessToken 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getStoredAccessToken() {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canUseStorage()
  if (!canUseStorage()) return null;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: localStorage.getItem(ACCESS_TOKEN_KEY)
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

// 코드 설명: setStoredAccessToken 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function setStoredAccessToken(accessToken: string) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canUseStorage()
  if (!canUseStorage()) return;
  // 코드 설명: 브라우저 localStorage의 인증 또는 사용자 설정 값을 읽거나 갱신합니다.
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

// 코드 설명: getUserFromAuthResponse 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getUserFromAuthResponse(response: AuthResponse) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: response.user ?? response.data?.user ?? null
  return response.user ?? response.data?.user ?? null;
}

// 코드 설명: getStoredAuthUser 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getStoredAuthUser(): AuthUser | null {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canUseStorage()
  if (!canUseStorage()) return null;

  // 코드 설명: rawUser 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !rawUser
  if (!rawUser) return null;

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: JSON.parse(rawUser) as AuthUser
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    // 코드 설명: 브라우저 localStorage의 인증 또는 사용자 설정 값을 읽거나 갱신합니다.
    localStorage.removeItem(AUTH_USER_KEY);
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
    return null;
  }
}

// 코드 설명: setStoredAuthUser 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function setStoredAuthUser(user: AuthUser | null | undefined) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canUseStorage() || !user
  if (!canUseStorage() || !user) return;
  // 코드 설명: 브라우저 localStorage의 인증 또는 사용자 설정 값을 읽거나 갱신합니다.
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

// 코드 설명: clearStoredAuth 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function clearStoredAuth() {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canUseStorage()
  if (!canUseStorage()) return;
  // 코드 설명: 브라우저 localStorage의 인증 또는 사용자 설정 값을 읽거나 갱신합니다.
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  // 코드 설명: 브라우저 localStorage의 인증 또는 사용자 설정 값을 읽거나 갱신합니다.
  localStorage.removeItem(AUTH_USER_KEY);
}
