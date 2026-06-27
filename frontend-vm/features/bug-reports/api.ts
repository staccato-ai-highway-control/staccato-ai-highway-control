/**
 * 파일 역할: 버그 신고 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
// 코드 설명: @/lib/constants 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { API_BASE_URL } from "@/lib/constants";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAccessToken } from "@/lib/authStorage";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type {
  BugReport,
  BugReportAttachment,
  BugReportAttachmentUploadResponse,
  BugReportCreateRequest,
  BugReportListParams,
  BugReportListResponse,
  BugReportUpdateRequest,
} from "./types";

// 코드 설명: RawBugReportListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RawBugReportListResponse =
  | BugReport[]
  | FlexibleApiResponse<BugReportListResponse | BugReport[]>
  | { items?: BugReport[]; page?: number; size?: number; total_count?: number; total_pages?: number };

// 코드 설명: RawBugReportDetailResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RawBugReportDetailResponse =
  | FlexibleApiResponse<BugReport>
  | { bug_report?: BugReport; report?: BugReport }
  | BugReport;

// 코드 설명: joinUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function joinUrl(path: string) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: /^https?:\/\//.test(path)
  if (/^https?:\/\//.test(path)) return path;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
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

// 코드 설명: buildQuery 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function buildQuery(params: BugReportListParams = {}) {
  // 코드 설명: query 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
  const query = new URLSearchParams();

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: Object.entries(params).forEach(([key, value]) => { if (value !== undefi…
  Object.entries(params).forEach(([key, value]) => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value !== undefined && value !== null && value !== ""
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });

  // 코드 설명: queryString 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const queryString = query.toString();
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: queryString ? `?${queryString}` : ""
  return queryString ? `?${queryString}` : "";
}

// 코드 설명: normalizeBugReportList 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeBugReportList(response: RawBugReportListResponse): BugReportListResponse {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response)
  if (Array.isArray(response)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items: response, page: 1, size: response.length, total_count: respons…
    return { items: response, page: 1, size: response.length, total_count: response.length, total_pages: 1 };
  }

  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = getEnvelopeData<BugReportListResponse | BugReport[]>(
    response as FlexibleApiResponse<BugReportListResponse | BugReport[]>
  );

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(data)
  if (Array.isArray(data)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items: data, page: 1, size: data.length, total_count: data.length, to…
    return { items: data, page: 1, size: data.length, total_count: data.length, total_pages: 1 };
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items: data.items ?? [], page: data.page ?? 1, size: data.size ?? dat…
  return {
    items: data.items ?? [],
    page: data.page ?? 1,
    size: data.size ?? data.items?.length ?? 0,
    total_count: data.total_count ?? data.items?.length ?? 0,
    total_pages: data.total_pages ?? 1,
  };
}

// 코드 설명: fetchAttachmentBlob 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
async function fetchAttachmentBlob(path: string) {
  // 코드 설명: headers 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const headers = new Headers();
  // 코드 설명: token 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const token = getStoredAccessToken();
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: token
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await fetch(joinUrl(path), { headers });
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !response.ok
  if (!response.ok) {
    // 코드 설명: text 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const text = await response.text().catch(() => "");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: text && !isUnsafeErrorText(text)
    if (text && !isUnsafeErrorText(text)) throw new Error(text);
    // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error("첨부파일을 다운로드할 수 없습니다. 잠시 후 다시 시도해 주세요.")
    throw new Error("첨부파일을 다운로드할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: response.blob()
  return response.blob();
}

// 코드 설명: fetchBugReports 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function fetchBugReports(params: BugReportListParams = {}) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawBugReportListResponse>(`/api/bug-reports${buildQuery(params)}`);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeBugReportList(response)
  return normalizeBugReportList(response);
}

// 코드 설명: getMyBugReports 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getMyBugReports(params: BugReportListParams = {}) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawBugReportListResponse>(`/api/bug-reports/my${buildQuery(params)}`);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeBugReportList(response)
  return normalizeBugReportList(response);
}

// 코드 설명: fetchBugReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function fetchBugReport(id: string | number) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawBugReportDetailResponse>(
    `/api/bug-reports/${id}`);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof response === "object" && response !== null
  if (typeof response === "object" && response !== null) {
    // 코드 설명: detail 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const detail = response as {
      data?: BugReport;
      bug_report?: BugReport;
      report?: BugReport;};

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: detail.data
    if (detail.data) return detail.data;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: detail.bug_report
    if (detail.bug_report) return detail.bug_report;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: detail.report
    if (detail.report) return detail.report;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<BugReport>(response as FlexibleApiResponse<BugReport>)
  return getEnvelopeData<BugReport>(response as FlexibleApiResponse<BugReport>);
}

// 코드 설명: updateBugReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function updateBugReport(id: string | number, payload: BugReportUpdateRequest) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<BugReport> | { bug_report?: BugReport }>(
    `/api/bug-reports/${id}`,
    {
      method: "PATCH",
      body: payload,
    }
  );

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof response === "object" && response !== null && "bug_report" in re…
  if (
    typeof response === "object" &&
    response !== null &&
    "bug_report" in response &&
    (response as { bug_report?: BugReport }).bug_report
  ) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: (response as { bug_report: BugReport }).bug_report
    return (response as { bug_report: BugReport }).bug_report;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<BugReport>( response as FlexibleApiResponse<BugReport> )
  return getEnvelopeData<BugReport>(
    response as FlexibleApiResponse<BugReport>
  );
}

// 코드 설명: closeBugReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function closeBugReport(id: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<FlexibleApiResponse<BugReport> | { bug_report?: BugReport }>(…
  return apiClient<FlexibleApiResponse<BugReport> | { bug_report?: BugReport }>(
    `/api/bug-reports/${id}`,
    {
      method: "DELETE",
    }
  );
}

// 코드 설명: createBugReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function createBugReport(payload: BugReportCreateRequest) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<BugReport> | { data?: BugReport; id?: number | string }>(
    "/api/bug-reports",
    {
      method: "POST",
      body: payload,
    }
  );

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<BugReport | { id?: number | string }>( response as Flex…
  return getEnvelopeData<BugReport | { id?: number | string }>(
    response as FlexibleApiResponse<BugReport | { id?: number | string }>
  );
}

// 코드 설명: uploadBugReportAttachments 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function uploadBugReportAttachments(bugReportId: string | number, files: File[]) {
  // 코드 설명: formData FormData를 만들어 텍스트와 파일을 multipart 요청으로 함께 보냅니다.
  const formData = new FormData();
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: files.forEach((file) => formData.append("files", file));
  files.forEach((file) => formData.append("files", file));

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<BugReportAttachmentUploadResponse>(`/api/bug-reports/${bugRep…
  return apiClient<BugReportAttachmentUploadResponse>(`/api/bug-reports/${bugReportId}/attachments`, {
    method: "POST",
    formData,
  });
}

// 코드 설명: downloadBugReportAttachment 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function downloadBugReportAttachment(attachmentId: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: fetchAttachmentBlob(`/api/bug-reports/attachments/${attachmentId}/downl…
  return fetchAttachmentBlob(`/api/bug-reports/attachments/${attachmentId}/download`);
}

// 코드 설명: downloadBugReportAttachmentUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function downloadBugReportAttachmentUrl(path: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: fetchAttachmentBlob(path)
  return fetchAttachmentBlob(path);
}

// 코드 설명: getBugReportAttachmentId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getBugReportAttachmentId(attachment: BugReportAttachment) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment.id
  return attachment.id;
}
