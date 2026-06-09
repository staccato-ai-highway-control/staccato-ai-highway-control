import { API_BASE_URL } from "@/lib/constants";
import { clearStoredAuth, getStoredAccessToken } from "@/lib/authStorage";

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
};

export type ApiErrorPayload = {
  success?: boolean;
  status_code?: number;
  error_code?: string;
  message?: string;
  error?: string;
  detail?: string;
  details?: unknown;
};

export const statusMessages: Record<number, string> = {
  401: "로그인이 필요합니다.",
  403: "접근 권한이 없습니다.",
  404: "요청한 데이터를 찾을 수 없습니다.",
  409: "이미 진행 중인 분석 작업입니다.",
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

function isUnsafeErrorText(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("<!doctype html") ||
    normalized.startsWith("<html") ||
    normalized.includes("werkzeug debugger") ||
    normalized.includes("traceback") ||
    normalized.includes("sqlalchemy") ||
    normalized.includes("internal server error") ||
    normalized.includes("axioserror") ||
    normalized.includes("typeerror:") ||
    /https?:\/\//i.test(value) ||
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(value) ||
    /\/(?:home|var|usr|tmp)\//.test(value)
  );
}

function safeErrorMessage(response: Response, message?: string | null) {
  if (!message || !message.trim()) return statusMessages[response.status] ?? `API 요청 실패: ${response.status}`;
  if (isUnsafeErrorText(message)) return statusMessages[response.status] ?? "요청을 처리하는 중 문제가 발생했습니다.";
  return message;
}

function getErrorDetails(response: Response, payload: unknown) {
  const errorPayload = typeof payload === "object" && payload !== null ? payload as ApiErrorPayload : null;
  const message = errorPayload?.message ?? errorPayload?.error ?? errorPayload?.detail;
  return {
    message: typeof payload === "string" ? safeErrorMessage(response, payload) : safeErrorMessage(response, message),
    errorCode: errorPayload?.error_code,
    statusCode: errorPayload?.status_code ?? response.status,
    payload,
  };
}

export class ApiError extends Error {
  statusCode: number;
  errorCode?: string;
  payload: unknown;

  constructor(message: string, statusCode: number, errorCode?: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.payload = payload;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function getErrorMessage(response: Response, payload: unknown) {
  if (typeof payload === "object" && payload !== null) {
    const errorPayload = payload as ApiErrorPayload;
    const message = errorPayload.message ?? errorPayload.error ?? errorPayload.detail;
    if (message) return safeErrorMessage(response, message);
  }

  if (typeof payload === "string" && payload.trim()) return safeErrorMessage(response, payload);
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
    if (response.status === 401) redirectToLogin();
    const details = getErrorDetails(response, payload);
    throw new ApiError(details.message, details.statusCode, details.errorCode, details.payload);
  }

  if (response.status === 204) return undefined as T;
  if (typeof payload === "object" && payload !== null && (payload as ApiErrorPayload).success === false) {
    const details = getErrorDetails(response, payload);
    throw new ApiError(details.message, details.statusCode, details.errorCode, details.payload);
  }
  return payload as T;
}

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

export type FlexibleApiResponse<T> =
  | T
  | ApiEnvelope<T>
  | { success?: boolean; message?: string; data?: T }
  | { success?: boolean; message?: string; result?: T };

export function getEnvelopeData<T>(response: FlexibleApiResponse<T>): T {
  if (typeof response === "object" && response !== null) {
    if ("data" in response && (response as { data?: T }).data !== undefined) {
      return (response as { data: T }).data;
    }

    if ("result" in response && (response as { result?: T }).result !== undefined) {
      return (response as { result: T }).result;
    }
  }

  return response as T;
}
