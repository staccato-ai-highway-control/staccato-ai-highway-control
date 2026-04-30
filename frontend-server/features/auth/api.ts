import type {
  AuthResponse,
  LoginRequest,
  SignupApiRequest,
  SignupRequest,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? `API 요청 실패: ${response.status}`);
  }

  return data as T;
}

export function mapSignupRequest(payload: SignupRequest): SignupApiRequest {
  return {
    email: payload.email,
    password: payload.password,
    name: payload.name,
    phone: payload.phone || undefined,
    requested_role: payload.requestedRole,
    request_memo: payload.reason || undefined,
  };
}

export function signup(payload: SignupRequest) {
  return request<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(mapSignupRequest(payload)),
  });
}

export function login(payload: LoginRequest) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(accessToken: string) {
  return request<AuthResponse>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// TODO: 백엔드 이메일 인증 API 구현 후 실제 endpoint 연결
export async function sendEmailVerification() {
  throw new Error("이메일 인증 API는 아직 구현 전입니다.");
}

// TODO: 백엔드 이메일 인증 API 구현 후 실제 endpoint 연결
export async function verifyEmailCode() {
  throw new Error("이메일 인증 API는 아직 구현 전입니다.");
}