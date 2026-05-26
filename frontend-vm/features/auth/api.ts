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

export function signup(payload: SignupRequest | SignupApiRequest) {
  const body = "requestedRole" in payload ? mapSignupRequest(payload) : payload;
  return apiClient<AuthResponse>("/auth/signup", {
    method: "POST",
    auth: false,
    body,
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

export function updateMyProfile(payload: ProfileUpdateRequest) {
  return apiClient<AuthResponse>("/auth/me/profile", {
    method: "PATCH",
    body: payload,
  });
}

export function changeMyPassword(payload: PasswordUpdateRequest) {
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

export function verifyEmail(payload: VerifyEmailRequest) {
  return apiClient<AuthResponse>("/auth/verify-email", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

export function verifyEmailCode(email: string, code: string) {
  return verifyEmail({ email, code });
}

export function startGoogleIdentityVerification() {
  return apiClient<GoogleIdentityStartResponse>("/auth/identity/google/start", {
    method: "POST",
    body: {},
  });
}

export function startSignupGoogleIdentityVerification(email: string) {
  return apiClient<GoogleIdentityStartResponse>("/auth/signup/identity/google/start", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export function getAuthHealth() {
  return apiClient("/auth/health", { auth: false });
}
