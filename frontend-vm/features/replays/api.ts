/**
 * 파일 역할: 영상 재생 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ReplayItem, ReplayListParams, ReplayListResponse } from "./types";

// 코드 설명: RawReplayListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RawReplayListResponse =
  | ReplayItem[]
  | FlexibleApiResponse<ReplayListResponse>
  | { items?: ReplayItem[]; page?: number; size?: number; total_count?: number; total_pages?: number };

// 코드 설명: buildQuery 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function buildQuery(params: ReplayListParams = {}) {
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

// 코드 설명: normalizeReplayList 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeReplayList(response: RawReplayListResponse): ReplayListResponse {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response)
  if (Array.isArray(response)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { items: response, page: 1, size: response.length, total_count: respons…
    return { items: response, page: 1, size: response.length, total_count: response.length, total_pages: 1 };
  }

  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = getEnvelopeData<ReplayListResponse | ReplayItem[]>(response as FlexibleApiResponse<ReplayListResponse | ReplayItem[]>);
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
    total_pages: data.total_pages ?? 0,
  };
}

// 코드 설명: fetchReplays 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function fetchReplays(params: ReplayListParams = {}) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RawReplayListResponse>(`/api/replays${buildQuery(params)}`, { auth: false });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeReplayList(response)
  return normalizeReplayList(response);
}

// 코드 설명: fetchReplay 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function fetchReplay(incidentId: string | number) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<ReplayItem>>(`/api/replays/${incidentId}`, { auth: false });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<ReplayItem>(response)
  return getEnvelopeData<ReplayItem>(response);
}
