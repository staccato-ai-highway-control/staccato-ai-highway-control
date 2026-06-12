/**
 * 파일 역할: 인증 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import type {
  AuthResponse,
  GoogleIdentityStartResponse,
  LoginRequest,
  PasswordUpdateRequest,
  ProfileUpdateRequest,
  SendEmailVerificationRequest,
  SignupApiRequest,
  SignupRequest,
  VerifyEmailRequest,
} from "./types";
// 코드 설명: @/lib/apiClient 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { apiClient } from "@/lib/apiClient";

// 코드 설명: mapSignupRequest 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function mapSignupRequest(payload: SignupRequest): SignupApiRequest {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { login_id: payload.login_id, email: payload.email, password: payload.p…
  return {
    login_id: payload.login_id,
    email: payload.email,
    password: payload.password,
    name: payload.name,
    phone: payload.phone?.trim() || undefined,
    requested_role: payload.requestedRole,
    request_memo: payload.reason?.trim() || undefined,
    agreed: payload.agreed,
    identity_method: payload.identityMethod,
  };
}

// 코드 설명: signup 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function signup(payload: SignupRequest | SignupApiRequest) {
  // 코드 설명: body 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const body = "requestedRole" in payload ? mapSignupRequest(payload) : payload;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<AuthResponse>("/auth/signup", { method: "POST", auth: false, …
  return apiClient<AuthResponse>("/auth/signup", {
    method: "POST",
    auth: false,
    body,
  });
}

// 코드 설명: login 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function login(payload: LoginRequest) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<AuthResponse>("/auth/login", { method: "POST", auth: false, b…
  return apiClient<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

// 코드 설명: getMe 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getMe(_accessToken?: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<AuthResponse>("/auth/me", { method: "GET" })
  return apiClient<AuthResponse>("/auth/me", { method: "GET" });
}

// 코드 설명: updateMyProfile 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function updateMyProfile(payload: ProfileUpdateRequest) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<AuthResponse>("/auth/me/profile", { method: "PATCH", body: pa…
  return apiClient<AuthResponse>("/auth/me/profile", {
    method: "PATCH",
    body: payload,
  });
}

// 코드 설명: changeMyPassword 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function changeMyPassword(payload: PasswordUpdateRequest) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<AuthResponse>("/auth/me/password", { method: "PATCH", body: p…
  return apiClient<AuthResponse>("/auth/me/password", {
    method: "PATCH",
    body: payload,
  });
}

// 코드 설명: deleteMyAccount 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function deleteMyAccount() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<AuthResponse>("/auth/me", { method: "DELETE" })
  return apiClient<AuthResponse>("/auth/me", { method: "DELETE" });
}

// 코드 설명: sendEmailVerificationCode 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function sendEmailVerificationCode(email: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<AuthResponse>("/auth/verify-email/resend", { method: "POST", …
  return apiClient<AuthResponse>("/auth/verify-email/resend", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

// 코드 설명: resendEmailVerification 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function resendEmailVerification(payload: SendEmailVerificationRequest) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: sendEmailVerificationCode(payload.email)
  return sendEmailVerificationCode(payload.email);
}

// 코드 설명: verifyEmail 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function verifyEmail(payload: VerifyEmailRequest) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<AuthResponse>("/auth/verify-email", { method: "POST", auth: f…
  return apiClient<AuthResponse>("/auth/verify-email", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

// 코드 설명: verifyEmailCode 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function verifyEmailCode(email: string, code: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: verifyEmail({ email, code })
  return verifyEmail({ email, code });
}

// 코드 설명: startGoogleIdentityVerification 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function startGoogleIdentityVerification() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<GoogleIdentityStartResponse>("/auth/identity/google/start", {…
  return apiClient<GoogleIdentityStartResponse>("/auth/identity/google/start", {
    method: "POST",
    body: {},
  });
}

// 코드 설명: startSignupGoogleIdentityVerification 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function startSignupGoogleIdentityVerification(email: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<GoogleIdentityStartResponse>("/auth/signup/identity/google/st…
  return apiClient<GoogleIdentityStartResponse>("/auth/signup/identity/google/start", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

// 코드 설명: getAuthHealth 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getAuthHealth() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient("/auth/health", { auth: false })
  return apiClient("/auth/health", { auth: false });
}
