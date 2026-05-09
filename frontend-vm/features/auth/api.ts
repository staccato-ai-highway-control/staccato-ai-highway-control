import type {
  AuthResponse,
  LoginRequest,
  SendEmailVerificationRequest,
  SignupApiRequest,
  SignupRequest,
  VerifyEmailTokenRequest,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_PROXY_PATH ?? "/backend-api";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      `API 서버에 연결할 수 없습니다. 서버 주소를 확인해주세요: ${API_BASE_URL}`
    );
  }

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

export function resendEmailVerification(payload: SendEmailVerificationRequest) {
  return request<AuthResponse>("/auth/verify-email/resend", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmailToken(payload: VerifyEmailTokenRequest) {
  return request<AuthResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
