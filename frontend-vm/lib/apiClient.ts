/**
 * 파일 역할: apiClient 관련 처리를 여러 기능에서 재사용할 수 있도록 제공하는 공통 유틸리티입니다.
 * 유지보수 참고: 호출 범위가 넓으므로 입력 경계값과 브라우저/서버 실행 환경 차이를 고려해 동작을 변경해야 합니다.
 *
 * UI -> features API -> apiClient -> Next.js 프록시/Route Handler -> Flask 또는 AI VM
 * -> 응답 파싱 -> 오류 표준화 -> 기능 API -> UI 상태 순서로 데이터가 왕복합니다.
 * 토큰 첨부, 본문 직렬화, 네트워크 오류 변환, 401 로그아웃을 공통 처리합니다.
 */
import { API_BASE_URL } from "@/lib/constants";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { clearStoredAuth, getStoredAccessToken } from "@/lib/authStorage";

// 코드 설명: ApiOptions 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
};

// 코드 설명: ApiErrorPayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ApiErrorPayload = {
  success?: boolean;
  status_code?: number;
  error_code?: string;
  message?: string;
  error?: string;
  detail?: string;
  details?: unknown;
};

// 코드 설명: statusMessages 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const statusMessages: Record<number, string> = {
  401: "로그인이 필요합니다.",
  403: "접근 권한이 없습니다.",
  404: "요청한 데이터를 찾을 수 없습니다.",
  409: "이미 진행 중인 분석 작업입니다.",
  413: "업로드 파일 크기가 너무 큽니다.",
  415: "지원하지 않는 파일 형식입니다.",
  500: "서버 처리 중 오류가 발생했습니다.",
};

// 절대 URL은 유지하고 상대 경로만 실행 환경에 맞는 API_BASE_URL과 결합합니다.
function joinUrl(path: string) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: /^https?:\/\//.test(path)
  if (/^https?:\/\//.test(path)) return path;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// 코드 설명: redirectToLogin 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function redirectToLogin() {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof window === "undefined"
  if (typeof window === "undefined") return;

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: clearStoredAuth();
  clearStoredAuth();
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: window.location.pathname !== "/login"
  if (window.location.pathname !== "/login") {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.location.replace("/login");
    window.location.replace("/login");
  }
}

// text로 한 번 읽은 뒤 JSON 파싱을 시도해 빈 응답과 비JSON 오류도 처리합니다.
async function parseResponseBody(response: Response) {
  // 코드 설명: text 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const text = await response.text().catch(() => "");
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !text
  if (!text) return null;

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: JSON.parse(text) as ApiErrorPayload | unknown
    return JSON.parse(text) as ApiErrorPayload | unknown;
  } catch {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: text
    return text;
  }
}

// 코드 설명: isUnsafeErrorText 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isUnsafeErrorText(value: string) {
  // 코드 설명: normalized 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const normalized = value.trim().toLowerCase();
  // 코드 설명: 여러 검사 조건을 논리 연산으로 결합해 최종 boolean 판정 결과를 반환합니다.
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

// 코드 설명: safeErrorMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function safeErrorMessage(response: Response, message?: string | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !message || !message.trim()
  if (!message || !message.trim()) return statusMessages[response.status] ?? `API 요청 실패: ${response.status}`;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isUnsafeErrorText(message)
  if (isUnsafeErrorText(message)) return statusMessages[response.status] ?? "요청을 처리하는 중 문제가 발생했습니다.";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: message
  return message;
}

// 코드 설명: getErrorDetails 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getErrorDetails(response: Response, payload: unknown) {
  // 코드 설명: errorPayload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const errorPayload = typeof payload === "object" && payload !== null ? payload as ApiErrorPayload : null;
  // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const message = errorPayload?.message ?? errorPayload?.error ?? errorPayload?.detail;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { message: typeof payload === "string" ? safeErrorMessage(response, pay…
  return {
    message: typeof payload === "string" ? safeErrorMessage(response, payload) : safeErrorMessage(response, message),
    errorCode: errorPayload?.error_code,
    statusCode: errorPayload?.status_code ?? response.status,
    payload,
  };
}

// 코드 설명: ApiError가 관련 상태와 동작을 하나의 객체 모델로 묶습니다.
export class ApiError extends Error {
  // 코드 설명: statusCode 속성에 인스턴스가 유지할 상태 또는 설정 값을 선언합니다.
  statusCode: number;
  // 코드 설명: errorCode 속성에 인스턴스가 유지할 상태 또는 설정 값을 선언합니다.
  errorCode?: string;
  // 코드 설명: payload 속성에 인스턴스가 유지할 상태 또는 설정 값을 선언합니다.
  payload: unknown;

  constructor(message: string, statusCode: number, errorCode?: string, payload?: unknown) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: super(message);
    super(message);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: this.name = "ApiError";
    this.name = "ApiError";
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: this.statusCode = statusCode;
    this.statusCode = statusCode;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: this.errorCode = errorCode;
    this.errorCode = errorCode;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: this.payload = payload;
    this.payload = payload;
  }
}

// 코드 설명: isApiError 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function isApiError(error: unknown): error is ApiError {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: error instanceof ApiError
  return error instanceof ApiError;
}

// 코드 설명: getErrorMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getErrorMessage(response: Response, payload: unknown) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof payload === "object" && payload !== null
  if (typeof payload === "object" && payload !== null) {
    // 코드 설명: errorPayload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const errorPayload = payload as ApiErrorPayload;
    // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const message = errorPayload.message ?? errorPayload.error ?? errorPayload.detail;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: message
    if (message) return safeErrorMessage(response, message);
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof payload === "string" && payload.trim()
  if (typeof payload === "string" && payload.trim()) return safeErrorMessage(response, payload);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: statusMessages[response.status] ?? `API 요청 실패: ${response.status}`
  return statusMessages[response.status] ?? `API 요청 실패: ${response.status}`;
}

// 코드 설명: apiClient 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  // 코드 설명: headers 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const headers = new Headers(options.headers);
  // 코드 설명: shouldAttachAuth 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const shouldAttachAuth = options.auth !== false;
  // 저장한 accessToken을 Bearer 헤더에 넣고 공개 API만 auth:false로 제외합니다.
  const token = shouldAttachAuth ? getStoredAccessToken() : null;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: token
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: options.body !== undefined && !options.formData
  if (options.body !== undefined && !options.formData) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: headers.set("Content-Type", "application/json");
    headers.set("Content-Type", "application/json");
  }

  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  let response: Response;

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: response = await fetch(joinUrl(path), { ...options, headers, body: opti…
    response = await fetch(joinUrl(path), {
      ...options,
      headers,
      body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error("Flask 서버에 연결할 수 없습니다.")
    throw new Error("Flask 서버에 연결할 수 없습니다.");
  }

  // 코드 설명: payload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const payload = await parseResponseBody(response);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !response.ok
  if (!response.ok) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: response.status === 401
    if (response.status === 401) redirectToLogin();
    // 코드 설명: details 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const details = getErrorDetails(response, payload);
    // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new ApiError(details.message, details.statusCode, details.errorCode, de…
    throw new ApiError(details.message, details.statusCode, details.errorCode, details.payload);
  }

  // 204 응답에는 본문이 없으므로 호출부가 기대하는 undefined로 반환합니다.
  if (response.status === 204) return undefined as T;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof payload === "object" && payload !== null && (payload as ApiError…
  if (typeof payload === "object" && payload !== null && (payload as ApiErrorPayload).success === false) {
    // 코드 설명: details 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const details = getErrorDetails(response, payload);
    // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new ApiError(details.message, details.statusCode, details.errorCode, de…
    throw new ApiError(details.message, details.statusCode, details.errorCode, details.payload);
  }
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: payload as T
  return payload as T;
}

// 코드 설명: ApiEnvelope 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

// 코드 설명: FlexibleApiResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type FlexibleApiResponse<T> =
  | T
  | ApiEnvelope<T>
  | { success?: boolean; message?: string; data?: T }
  | { success?: boolean; message?: string; result?: T };

// T, { data: T }, { result: T } 응답을 화면이 사용할 T 하나로 통일합니다.
export function getEnvelopeData<T>(response: FlexibleApiResponse<T>): T {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof response === "object" && response !== null
  if (typeof response === "object" && response !== null) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: "data" in response && (response as { data?: T }).data !== undefined
    if ("data" in response && (response as { data?: T }).data !== undefined) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: (response as { data: T }).data
      return (response as { data: T }).data;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: "result" in response && (response as { result?: T }).result !== undefin…
    if ("result" in response && (response as { result?: T }).result !== undefined) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: (response as { result: T }).result
      return (response as { result: T }).result;
    }
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: response as T
  return response as T;
}
