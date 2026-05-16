import type {
  AuthResponse,
  GoogleIdentityStartResponse,
  LoginRequest,
  SendEmailVerificationRequest,
  SignupApiRequest,
  SignupRequest,
} from "./types";
import { apiClient } from "@/lib/apiClient";


export function mapSignupRequest(payload: SignupRequest): SignupApiRequest {
  return {
    login_id: payload.login_id,
    email: payload.email,
    password: payload.password,
    name: payload.name,
    phone: payload.phone?.trim() || undefined,
    requested_role: payload.requestedRole,
    request_memo: payload.reason?.trim() || undefined,
    agreed: payload.agreed,
  };
}

export function signup(payload: SignupRequest) {
  return apiClient<AuthResponse>("/auth/signup", {
    method: "POST",
    auth: false,
    body: mapSignupRequest(payload),
  });
}

export function login(payload: LoginRequest) {
  return apiClient<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

export function getMe(_accessToken?: string) {
  return apiClient<AuthResponse>("/auth/me", { method: "GET" });
}

export function changeMyPassword(payload: { current_password: string; new_password: string }) {
  return apiClient<AuthResponse>("/auth/me/password", {
    method: "PATCH",
    body: payload,
  });
}

export function deleteMyAccount() {
  return apiClient<AuthResponse>("/auth/me", { method: "DELETE" });
}

export function sendEmailVerificationCode(email: string) {
  return apiClient<AuthResponse>("/auth/verify-email/resend", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export function resendEmailVerification(payload: SendEmailVerificationRequest) {
  return sendEmailVerificationCode(payload.email);
}

export function verifyEmailCode(email: string, code: string) {
  return apiClient<AuthResponse>("/auth/verify-email", {
    method: "POST",
    auth: false,
    body: { email, code },
  });
}

export function startGoogleIdentityVerification(email: string) {
  return apiClient<GoogleIdentityStartResponse>("/auth/identity/google/start", {
    method: "POST",
    auth: false,
    body: { email },
  });
}
