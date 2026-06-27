/**
 * 파일 역할: 보고서 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
// 코드 설명: @/lib/constants 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { API_BASE_URL } from "@/lib/constants";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAccessToken } from "@/lib/authStorage";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type {
  MyReportListParams,
  PaginatedReports,
  Report,
  ReportListParams,
  ReportPriority,
  PaginatedReportDrafts,
  ReportDraft,
  ReportDraftPayload,
  ReportDraftResponse,
  ReportDraftSubmitResponse,
  ReportType,
  ReportAnalysisJob,
  ReportAnalysisRequestResponse,
  ReportAnalysisComparisonCandidate,
  ReportAnalysisComparisonCandidatesResult,
  ReportAnalysisComparisonResult,
  ReportAnalysisStatus,
  ReportUploadResponse,
  UpdateReportPayload,
  UpdateReportStatusPayload,
  UploadPurpose,
} from "./types";

// 코드 설명: UploadReportPayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type UploadReportPayload = {
  files: File[];
  reportType?: ReportType;
  uploadPurpose?: UploadPurpose;
  title: string;
  subject?: string;
  description?: string;
  location?: string;
  address?: string;
  placeName?: string;
  priority?: ReportPriority;
  latitude?: number;
  longitude?: number;
  isDemoData?: boolean;
};

// 코드 설명: CreateReportPayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type CreateReportPayload = UploadReportPayload;

// 코드 설명: CreateIncidentReportPayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type CreateIncidentReportPayload = Omit<UploadReportPayload, "files"> & {
  file: File;
};

// 코드 설명: RawReportListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RawReportListResponse =
  | Report[]
  | {
      success?: boolean;
      data?: Report[] | Partial<PaginatedReports>;
      items?: Report[];
      reports?: Report[];
      page?: number;
      size?: number;
      total_count?: number;
      total_pages?: number;
    };

// 코드 설명: RawReportDetailResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RawReportDetailResponse = FlexibleApiResponse<Report> | { success?: boolean; message?: string; data?: Report; report?: Report } | Report;

// 코드 설명: RawReportDraftListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RawReportDraftListResponse =
  | ReportDraft[]
  | FlexibleApiResponse<Partial<PaginatedReportDrafts> | ReportDraft[]>
  | {
      success?: boolean;
      data?: Partial<PaginatedReportDrafts> | ReportDraft[];
      drafts?: ReportDraft[];
      items?: ReportDraft[];
      page?: number;
      size?: number;
      total_count?: number;
      total_pages?: number;
    };

// 코드 설명: RawReportDraftDetailResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RawReportDraftDetailResponse = FlexibleApiResponse<ReportDraft> | { success?: boolean; message?: string; draft?: ReportDraft; data?: ReportDraft } | ReportDraft;

// 코드 설명: RawAnalysisComparisonCandidatesResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RawAnalysisComparisonCandidatesResponse =
  | ReportAnalysisComparisonCandidate[]
  | FlexibleApiResponse<ReportAnalysisComparisonCandidatesResult | ReportAnalysisComparisonCandidate[]>
  | { candidates?: ReportAnalysisComparisonCandidate[]; items?: ReportAnalysisComparisonCandidate[] };

// 코드 설명: RawAnalysisComparisonResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RawAnalysisComparisonResponse =
  | FlexibleApiResponse<ReportAnalysisComparisonResult>
  | { comparison?: ReportAnalysisComparisonResult };

// 코드 설명: LocationSearchItem 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type LocationSearchItem = {
  id?: string | number;
  location?: string;
  name?: string;
  title?: string;
  address?: string;
  road_name?: string;
  roadName?: string;
  location_name?: string;
  locationName?: string;
  latitude?: number | string;
  longitude?: number | string;
};

// 코드 설명: LocationSearchResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type LocationSearchResponse =
  | FlexibleApiResponse<{ items?: LocationSearchItem[] }>
  | { items?: LocationSearchItem[] }
  | LocationSearchItem[];

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

// 코드 설명: fetchAttachmentBlob 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
async function fetchAttachmentBlob(path: string) {
  // 코드 설명: token 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const token = getStoredAccessToken();
  // 코드 설명: headers 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const headers = new Headers();
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
    // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error(`첨부파일 요청 실패: ${response.status}`)
    throw new Error(`첨부파일 요청 실패: ${response.status}`);
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: response.blob()
  return response.blob();
}

// 코드 설명: appendOptional 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function appendOptional(formData: FormData, key: string, value: string | number | boolean | null | undefined) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value !== null && value !== undefined && value !== ""
  if (value !== null && value !== undefined && value !== "") formData.append(key, String(value));
}

// 코드 설명: appendFiniteNumber 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function appendFiniteNumber(formData: FormData, key: string, value: number | null | undefined) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value !== null && value !== undefined && Number.isFinite(value)
  if (value !== null && value !== undefined && Number.isFinite(value)) formData.append(key, String(value));
}

// 코드 설명: buildQuery 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function buildQuery(params: ReportListParams | MyReportListParams | Record<string, string | number | boolean | undefined> = {}) {
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

// 코드 설명: normalizeReportDraftList 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeReportDraftList(response: RawReportDraftListResponse): PaginatedReportDrafts {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response)
  if (Array.isArray(response)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items: response, page: 1, size: response.length, total_count: respons…
    return { items: response, page: 1, size: response.length, total_count: response.length, total_pages: 1 };
  }

  // 코드 설명: draftResponse 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const draftResponse = response as {
    data?: Partial<PaginatedReportDrafts> | ReportDraft[];
    drafts?: ReportDraft[];
    items?: ReportDraft[];
    page?: number;
    size?: number;
    total_count?: number;
    total_pages?: number;
  };
  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = draftResponse.data;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(data)
  if (Array.isArray(data)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items: data, page: draftResponse.page ?? 1, size: draftResponse.size …
    return { items: data, page: draftResponse.page ?? 1, size: draftResponse.size ?? data.length, total_count: draftResponse.total_count ?? data.length, total_pages: draftResponse.total_pages ?? 1 };
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: data && Array.isArray(data.items)
  if (data && Array.isArray(data.items)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items: data.items, page: data.page ?? draftResponse.page ?? 1, size: …
    return {
      items: data.items,
      page: data.page ?? draftResponse.page ?? 1,
      size: data.size ?? draftResponse.size ?? data.items.length,
      total_count: data.total_count ?? draftResponse.total_count ?? data.items.length,
      total_pages: data.total_pages ?? draftResponse.total_pages ?? 1,
    };
  }

  // 코드 설명: items 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const items = draftResponse.drafts ?? draftResponse.items ?? [];
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items, page: draftResponse.page ?? 1, size: draftResponse.size ?? ite…
  return {
    items,
    page: draftResponse.page ?? 1,
    size: draftResponse.size ?? items.length,
    total_count: draftResponse.total_count ?? items.length,
    total_pages: draftResponse.total_pages ?? 1,
  };
}

// 코드 설명: normalizeReportList 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeReportList(response: RawReportListResponse): PaginatedReports {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response)
  if (Array.isArray(response)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items: response, page: 1, size: response.length, total_count: respons…
    return { items: response, page: 1, size: response.length, total_count: response.length, total_pages: 1 };
  }

  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = response.data;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(data)
  if (Array.isArray(data)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items: data, page: response.page ?? 1, size: response.size ?? data.le…
    return { items: data, page: response.page ?? 1, size: response.size ?? data.length, total_count: response.total_count ?? data.length, total_pages: response.total_pages ?? 1 };
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: data && Array.isArray(data.items)
  if (data && Array.isArray(data.items)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items: data.items, page: data.page ?? response.page ?? 1, size: data.…
    return {
      items: data.items,
      page: data.page ?? response.page ?? 1,
      size: data.size ?? response.size ?? data.items.length,
      total_count: data.total_count ?? response.total_count ?? data.items.length,
      total_pages: data.total_pages ?? response.total_pages ?? 1,
    };
  }

  // 코드 설명: items 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const items = response.items ?? response.reports ?? [];
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items, page: response.page ?? 1, size: response.size ?? items.length,…
  return {
    items,
    page: response.page ?? 1,
    size: response.size ?? items.length,
    total_count: response.total_count ?? items.length,
    total_pages: response.total_pages ?? 1,
  };
}

// 코드 설명: getReportsHealth 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getReportsHealth() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient("/api/reports/health", { auth: false })
  return apiClient("/api/reports/health", { auth: false });
}

// 코드 설명: getReports 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getReports(params: ReportListParams = {}) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawReportListResponse>(`/api/reports${buildQuery(params)}`);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeReportList(response)
  return normalizeReportList(response);
}

// 코드 설명: getMyReports 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getMyReports(params: MyReportListParams = {}) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawReportListResponse>(`/api/reports/my${buildQuery(params)}`);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeReportList(response)
  return normalizeReportList(response);
}

// 코드 설명: getReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getReport(reportId: string | number) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawReportDetailResponse>(`/api/reports/${reportId}`);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof response === "object" && response !== null
  if (typeof response === "object" && response !== null) {
    // 코드 설명: detail 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const detail = response as { data?: Report; report?: Report };
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: detail.data
    if (detail.data) return detail.data;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: detail.report
    if (detail.report) return detail.report;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<Report>(response as FlexibleApiResponse<Report>)
  return getEnvelopeData<Report>(response as FlexibleApiResponse<Report>);
}

// 코드 설명: createReportDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function createReportDraft(payload: ReportDraftPayload) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<ReportDraftResponse>("/api/reports/drafts", {
    method: "POST",
    body: payload,
  });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: response
  return response;
}

// 코드 설명: getMyReportDrafts 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getMyReportDrafts(params: { page?: number; size?: number } = {}) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawReportDraftListResponse>("/api/reports/drafts" + buildQuery(params));
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeReportDraftList(response)
  return normalizeReportDraftList(response);
}

// 코드 설명: getReportDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getReportDraft(draftId: string | number) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawReportDraftDetailResponse>("/api/reports/drafts/" + draftId);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof response === "object" && response !== null
  if (typeof response === "object" && response !== null) {
    // 코드 설명: detail 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const detail = response as { data?: ReportDraft; draft?: ReportDraft };
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: detail.draft
    if (detail.draft) return detail.draft;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: detail.data
    if (detail.data) return detail.data;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<ReportDraft>(response as FlexibleApiResponse<ReportDraf…
  return getEnvelopeData<ReportDraft>(response as FlexibleApiResponse<ReportDraft>);
}

// 코드 설명: updateReportDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function updateReportDraft(draftId: string | number, payload: ReportDraftPayload) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<ReportDraftResponse>("/api/reports/drafts/" + draftId, {
    method: "PATCH",
    body: payload,
  });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: response
  return response;
}

// 코드 설명: deleteReportDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function deleteReportDraft(draftId: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<{ success?: boolean; message?: string }>("/api/reports/drafts…
  return apiClient<{ success?: boolean; message?: string }>("/api/reports/drafts/" + draftId, { method: "DELETE" });
}

// 코드 설명: submitReportDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function submitReportDraft(draftId: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ReportDraftSubmitResponse>("/api/reports/drafts/" + draftId +…
  return apiClient<ReportDraftSubmitResponse>("/api/reports/drafts/" + draftId + "/submit", {
    method: "POST",
    body: {},
  });
}

// 코드 설명: createReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function createReport(payload: CreateReportPayload) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: uploadReport(payload)
  return uploadReport(payload);
}

// 코드 설명: uploadReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function uploadReport(payload: UploadReportPayload) {
  // 코드 설명: formData FormData를 만들어 텍스트와 파일을 multipart 요청으로 함께 보냅니다.
  const formData = new FormData();

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: payload.files.forEach((file) => formData.append("files", file));
  payload.files.forEach((file) => formData.append("files", file));
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendOptional(formData, "report_type", payload.reportType ?? "GENERAL"…
  appendOptional(formData, "report_type", payload.reportType ?? "GENERAL");
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendOptional(formData, "upload_purpose", payload.uploadPurpose ?? "AN…
  appendOptional(formData, "upload_purpose", payload.uploadPurpose ?? "ANALYSIS");
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendOptional(formData, "title", payload.title);
  appendOptional(formData, "title", payload.title);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendOptional(formData, "subject", payload.subject);
  appendOptional(formData, "subject", payload.subject);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendOptional(formData, "description", payload.description);
  appendOptional(formData, "description", payload.description);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendOptional(formData, "priority", payload.priority ?? "NORMAL");
  appendOptional(formData, "priority", payload.priority ?? "NORMAL");
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendOptional(formData, "is_demo_data", payload.isDemoData ? 1 : undef…
  appendOptional(formData, "is_demo_data", payload.isDemoData ? 1 : undefined);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendOptional(formData, "location", payload.location);
  appendOptional(formData, "location", payload.location);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendOptional(formData, "address", payload.address);
  appendOptional(formData, "address", payload.address);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendOptional(formData, "place_name", payload.placeName);
  appendOptional(formData, "place_name", payload.placeName);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendFiniteNumber(formData, "latitude", payload.latitude);
  appendFiniteNumber(formData, "latitude", payload.latitude);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: appendFiniteNumber(formData, "longitude", payload.longitude);
  appendFiniteNumber(formData, "longitude", payload.longitude);

  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<ReportUploadResponse>>("/api/reports", {
    method: "POST",
    formData,
  });

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<ReportUploadResponse>(response)
  return getEnvelopeData<ReportUploadResponse>(response);
}

// 코드 설명: updateReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function updateReport(reportId: string | number, payload: UpdateReportPayload) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<Report>>(`/api/reports/${reportId}`, {
    method: "PATCH",
    body: payload,
  });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<Report>(response)
  return getEnvelopeData<Report>(response);
}

// 코드 설명: deleteReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function deleteReport(reportId: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<{ success?: boolean; message?: string }>(`/api/reports/${repo…
  return apiClient<{ success?: boolean; message?: string }>(`/api/reports/${reportId}`, { method: "DELETE" });
}

// 코드 설명: searchLocations 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function searchLocations(keyword: string, size = 5) {
  // 코드 설명: params 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
  const params = new URLSearchParams({ keyword, size: String(size) });
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<LocationSearchResponse>(`/api/locations/search?${params.toString()}`);
  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = Array.isArray(response) ? { items: response } : getEnvelopeData<{ items?: LocationSearchItem[] }>(response);

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: data.items ?? []
  return data.items ?? [];
}

// 코드 설명: createIncidentReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function createIncidentReport(payload: CreateIncidentReportPayload) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: uploadReport({ ...payload, files: [payload.file], reportType: payload.r…
  return uploadReport({
    ...payload,
    files: [payload.file],
    reportType: payload.reportType ?? "GENERAL",
    uploadPurpose: payload.uploadPurpose ?? "ANALYSIS",
    priority: payload.priority ?? "NORMAL",
    isDemoData: payload.isDemoData ?? payload.uploadPurpose === "TEST_DEMO",
  });
}

// 코드 설명: requestReportAnalysis 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function requestReportAnalysis(reportId: string | number, payload?: Record<string, unknown>) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<ReportAnalysisRequestResponse>(`/api/reports/${reportId}/anal…
  return apiClient<ReportAnalysisRequestResponse>(`/api/reports/${reportId}/analyze`, {
    method: "POST",
    body: payload ?? {},
  });
}

// 코드 설명: getAnalysisComparisonCandidates 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getAnalysisComparisonCandidates(params: { report_id?: string | number; selectedJobId?: string | number }) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawAnalysisComparisonCandidatesResponse>("/api/reports/analysis-comparisons/candidates" + buildQuery(params));
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response)
  if (Array.isArray(response)) return response;

  // 코드 설명: direct 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const direct = response as { candidates?: ReportAnalysisComparisonCandidate[]; items?: ReportAnalysisComparisonCandidate[] };
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: direct.candidates
  if (direct.candidates) return direct.candidates;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: direct.items
  if (direct.items) return direct.items;

  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = getEnvelopeData<ReportAnalysisComparisonCandidatesResult | ReportAnalysisComparisonCandidate[]>(response as FlexibleApiResponse<ReportAnalysisComparisonCandidatesResult | ReportAnalysisComparisonCandidate[]>);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(data)
  if (Array.isArray(data)) return data;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: data.items ?? []
  return data.items ?? [];
}

// 코드 설명: createAnalysisComparison 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function createAnalysisComparison(jobIds: Array<string | number>) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawAnalysisComparisonResponse>("/api/reports/analysis-comparisons", {
    method: "POST",
    body: { job_ids: jobIds },
  });

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof response === "object" && response !== null && "comparison" in re…
  if (typeof response === "object" && response !== null && "comparison" in response && (response as { comparison?: ReportAnalysisComparisonResult }).comparison) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: (response as { comparison: ReportAnalysisComparisonResult }).comparison
    return (response as { comparison: ReportAnalysisComparisonResult }).comparison;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<ReportAnalysisComparisonResult>(response as FlexibleApi…
  return getEnvelopeData<ReportAnalysisComparisonResult>(response as FlexibleApiResponse<ReportAnalysisComparisonResult>);
}
// 코드 설명: getReportAnalysisStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getReportAnalysisStatus(reportId: string | number) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<ReportAnalysisStatus> | { report?: ReportAnalysisStatus }>(`/api/reports/${reportId}/analysis-status`);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof response === "object" && response !== null && "report" in respon…
  if (typeof response === "object" && response !== null && "report" in response && (response as { report?: ReportAnalysisStatus }).report) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: (response as { report: ReportAnalysisStatus }).report
    return (response as { report: ReportAnalysisStatus }).report;
  }
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<ReportAnalysisStatus>(response as FlexibleApiResponse<R…
  return getEnvelopeData<ReportAnalysisStatus>(response as FlexibleApiResponse<ReportAnalysisStatus>);
}

// 코드 설명: getReportAnalysisJobs 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getReportAnalysisJobs(reportId: string | number) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<ReportAnalysisJob[]> | { jobs?: ReportAnalysisJob[] }>(`/api/reports/${reportId}/analysis-jobs`);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof response === "object" && response !== null && "jobs" in response
  if (typeof response === "object" && response !== null && "jobs" in response) return (response as { jobs?: ReportAnalysisJob[] }).jobs ?? [];
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<ReportAnalysisJob[]>(response as FlexibleApiResponse<Re…
  return getEnvelopeData<ReportAnalysisJob[]>(response as FlexibleApiResponse<ReportAnalysisJob[]>);
}

// 코드 설명: getReportAnalysisJob 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getReportAnalysisJob(jobId: string | number) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<ReportAnalysisJob>>(`/api/reports/analysis-jobs/${jobId}`);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<ReportAnalysisJob>(response)
  return getEnvelopeData<ReportAnalysisJob>(response);
}

// 코드 설명: retryReportAnalysisJob 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function retryReportAnalysisJob(jobId: string | number) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<ReportAnalysisJob> | { job?: ReportAnalysisJob }>(`/api/reports/analysis-jobs/${jobId}/retry`, {
    method: "POST",
    body: {},
  });
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof response === "object" && response !== null && "job" in response …
  if (typeof response === "object" && response !== null && "job" in response && (response as { job?: ReportAnalysisJob }).job) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: (response as { job: ReportAnalysisJob }).job
    return (response as { job: ReportAnalysisJob }).job;
  }
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<ReportAnalysisJob>(response as FlexibleApiResponse<Repo…
  return getEnvelopeData<ReportAnalysisJob>(response as FlexibleApiResponse<ReportAnalysisJob>);
}

// 코드 설명: updateReportStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function updateReportStatus(reportId: string | number, payload: UpdateReportStatusPayload) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<Report> | { report?: Report }>(`/api/reports/${reportId}/status`, {
    method: "PATCH",
    body: payload,
  });
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof response === "object" && response !== null && "report" in respon…
  if (typeof response === "object" && response !== null && "report" in response && (response as { report?: Report }).report) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: (response as { report: Report }).report
    return (response as { report: Report }).report;
  }
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<Report>(response as FlexibleApiResponse<Report>)
  return getEnvelopeData<Report>(response as FlexibleApiResponse<Report>);
}

// 코드 설명: approveReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function approveReport(reportId: string | number, memo = "") {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<FlexibleApiResponse<Report> | { report?: Report }>(`/api/repo…
  return apiClient<FlexibleApiResponse<Report> | { report?: Report }>(`/api/reports/${reportId}/approve`, {
    method: "POST",
    body: { memo },
  });
}

// 코드 설명: rejectReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function rejectReport(reportId: string | number, reason: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<FlexibleApiResponse<Report> | { report?: Report }>(`/api/repo…
  return apiClient<FlexibleApiResponse<Report> | { report?: Report }>(`/api/reports/${reportId}/reject`, {
    method: "POST",
    body: { reason },
  });
}


// 코드 설명: uploadReportAttachments 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function uploadReportAttachments(reportId: string | number, files: File[]) {
  // 코드 설명: formData FormData를 만들어 텍스트와 파일을 multipart 요청으로 함께 보냅니다.
  const formData = new FormData();
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: files.forEach((file) => formData.append("files", file));
  files.forEach((file) => formData.append("files", file));

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<{ success?: boolean; message?: string; data?: unknown }>(`/ap…
  return apiClient<{ success?: boolean; message?: string; data?: unknown }>(`/api/reports/${reportId}/attachments`, {
    method: "POST",
    formData,
  });
}

// 코드 설명: deleteReportAttachment 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function deleteReportAttachment(reportId: string | number, attachmentId: string | number, reason?: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<{ success?: boolean; message?: string }>(`/api/reports/${repo…
  return apiClient<{ success?: boolean; message?: string }>(`/api/reports/${reportId}/attachments/${attachmentId}`, {
    method: "DELETE",
    body: reason ? { reason } : undefined,
  });
}

// 코드 설명: previewReportAttachment 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function previewReportAttachment(attachmentId: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: fetchAttachmentBlob(`/api/reports/attachments/${attachmentId}/preview`)
  return fetchAttachmentBlob(`/api/reports/attachments/${attachmentId}/preview`);
}

// 코드 설명: previewReportAttachmentUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function previewReportAttachmentUrl(path: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: fetchAttachmentBlob(path)
  return fetchAttachmentBlob(path);
}

// 코드 설명: downloadReportAttachment 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function downloadReportAttachment(attachmentId: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: fetchAttachmentBlob(`/api/reports/attachments/${attachmentId}/download`)
  return fetchAttachmentBlob(`/api/reports/attachments/${attachmentId}/download`);
}

// 코드 설명: downloadReportAttachmentUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function downloadReportAttachmentUrl(path: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: fetchAttachmentBlob(path)
  return fetchAttachmentBlob(path);
}
