import { API_BASE_URL } from "@/lib/constants";
import { clearStoredAuth, getStoredAccessToken } from "@/lib/authStorage";

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
};

type ApiErrorPayload = {
  success?: boolean;
  error_code?: string;
  message?: string;
  details?: unknown;
};

const statusMessages: Record<number, string> = {
  401: "로그인이 필요합니다.",
  403: "접근 권한이 없습니다.",
  404: "요청한 데이터를 찾을 수 없습니다.",
  413: "업로드 파일 크기가 너무 큽니다.",
  415: "지원하지 않는 파일 형식입니다.",
  500: "서버 처리 중 오류가 발생했습니다.",
};

function joinUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;

  clearStoredAuth();
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

async function parseResponseBody(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text) as ApiErrorPayload | unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(response: Response, payload: unknown) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = (payload as ApiErrorPayload).message;
    if (message) return message;
  }

  if (typeof payload === "string" && payload.trim()) return payload;
  return statusMessages[response.status] ?? `API 요청 실패: ${response.status}`;
}

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const shouldAttachAuth = options.auth !== false;
  const token = shouldAttachAuth ? getStoredAccessToken() : null;

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body !== undefined && !options.formData) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(joinUrl(path), {
      ...options,
      headers,
      body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new Error("Flask 서버에 연결할 수 없습니다.");
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin();
    }

    throw new Error(getErrorMessage(response, payload));
  }

  if (response.status === 204) return undefined as T;
  return payload as T;
}

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

export function getEnvelopeData<T>(response: T | ApiEnvelope<T>): T {
  if (typeof response === "object" && response !== null && "data" in response) {
    return (response as ApiEnvelope<T>).data;
  }

  return response as T;
}
