/**
 * 파일 역할: 자료실 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
// 코드 설명: @/lib/apiClient 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { CreateResourcePayload, DeleteResourceResponse, GetResourcesParams, ResourceItem, ResourceListResponse, UpdateResourcePayload } from "./types";

// 코드 설명: RESOURCE_BASE_PATH 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const RESOURCE_BASE_PATH = "/api/resources";
// 코드 설명: RESOURCE_CATEGORIES 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const RESOURCE_CATEGORIES = new Set([
  "RESUME",
  "COVER_LETTER",
  "PRESENTATION",
  "MEETING_NOTE",
]);

// 코드 설명: normalizeCategory 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeCategory(category: unknown) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String(category ?? "").trim().toUpperCase()
  return String(category ?? "").trim().toUpperCase();
}

// 코드 설명: isResourceCategory 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isResourceCategory(category: unknown) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: RESOURCE_CATEGORIES.has(normalizeCategory(category))
  return RESOURCE_CATEGORIES.has(normalizeCategory(category));
}

// 코드 설명: buildQuery 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function buildQuery(params: GetResourcesParams = {}) {
  // 코드 설명: query 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
  const query = new URLSearchParams();
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: Object.entries(params).forEach(([key, value]) => { if (value !== undefi…
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== "") query.set(key, String(value)); });
  // 코드 설명: queryString 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const queryString = query.toString();
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: queryString ? `?${queryString}` : ""
  return queryString ? `?${queryString}` : "";
}

// 코드 설명: buildResourceFormData 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function buildResourceFormData(payload: CreateResourcePayload | UpdateResourcePayload) {
  // 코드 설명: formData FormData를 만들어 텍스트와 파일을 multipart 요청으로 함께 보냅니다.
  const formData = new FormData();
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: payload.category
  if (payload.category) formData.append("category", payload.category);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: payload.title
  if (payload.title) formData.append("title", payload.title);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: payload.description !== undefined
  if (payload.description !== undefined) formData.append("description", payload.description);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: payload.visibility
  if (payload.visibility) formData.append("visibility", payload.visibility);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: payload.author_name
  if (payload.author_name) formData.append("author_name", payload.author_name);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: payload.file
  if (payload.file) formData.append("file", payload.file);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: formData
  return formData;
}

// 코드 설명: getResources 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getResources(params: GetResourcesParams = {}) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<ResourceListResponse>>(
    `${RESOURCE_BASE_PATH}${buildQuery(params)}`
  );

  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = getEnvelopeData(response);
  // 코드 설명: items 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const items = data.items ?? [];

  // 코드 설명: isAccessLogMode 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isAccessLogMode = normalizeCategory(params.category) === "ACCESS_LOG";

  // 코드 설명: visibleItems 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const visibleItems = isAccessLogMode
    ? items.filter((item) => normalizeCategory(item.category) === "ACCESS_LOG")
    : items.filter((item) => isResourceCategory(item.category));

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { ...data, items: visibleItems, total: visibleItems.length, total_count…
  return {
    ...data,
    items: visibleItems,
    total: visibleItems.length,
    total_count: visibleItems.length,
    pages: 1,
    total_pages: 1,
  };
}

// 코드 설명: getResource 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getResource(id: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData(await apiClient<FlexibleApiResponse<ResourceItem>>(`${R…
  return getEnvelopeData(await apiClient<FlexibleApiResponse<ResourceItem>>(`${RESOURCE_BASE_PATH}/${id}`));
}

// 코드 설명: createResource 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function createResource(payload: CreateResourcePayload) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData(await apiClient<FlexibleApiResponse<ResourceItem>>(RESO…
  return getEnvelopeData(await apiClient<FlexibleApiResponse<ResourceItem>>(RESOURCE_BASE_PATH, { method: "POST", formData: buildResourceFormData(payload) }));
}

// 코드 설명: updateResource 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function updateResource(id: string | number, payload: UpdateResourcePayload) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData(await apiClient<FlexibleApiResponse<ResourceItem>>(`${R…
  return getEnvelopeData(await apiClient<FlexibleApiResponse<ResourceItem>>(`${RESOURCE_BASE_PATH}/${id}`, { method: "PATCH", formData: buildResourceFormData(payload) }));
}

// 코드 설명: deleteResource 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function deleteResource(id: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<DeleteResourceResponse>(`${RESOURCE_BASE_PATH}/${id}`, { meth…
  return apiClient<DeleteResourceResponse>(`${RESOURCE_BASE_PATH}/${id}`, { method: "DELETE" });
}

// 코드 설명: downloadResourceFile 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function downloadResourceFile(id: string | number, fileName: string) {
  const blob = await getResourceDownloadBlob(id);
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export async function getResourceDownloadBlob(id: string | number) {
  const blob = await apiClient<Blob>(`${RESOURCE_BASE_PATH}/${id}/download`, {
    method: "GET",
    responseType: "blob",
  });
  if (typeof Blob === "undefined" || !(blob instanceof Blob)) {
    throw new Error("다운로드 응답이 Blob 형식이 아닙니다.");
  }
  return blob;
}

// 코드 설명: getSecurityLogResources 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getSecurityLogResources(
  params: Omit<GetResourcesParams, "category"> = {}
) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getResources({ ...params, category: "ACCESS_LOG" as unknown as GetResou…
  return getResources({
    ...params,
    category: "ACCESS_LOG" as unknown as GetResourcesParams["category"],
  });
}