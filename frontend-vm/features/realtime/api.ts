/**
 * 파일 역할: 실시간 이벤트 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient } from "@/lib/apiClient";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { RecentIncidentEventsApiResponse, RealtimeEventPreview, RealtimeEventPreviewApiResponse, RealtimeIncidentEvent } from "./types";

// 코드 설명: normalizeRecentIncidentEvents 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeRecentIncidentEvents(response: RecentIncidentEventsApiResponse): RealtimeIncidentEvent[] {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response)
  if (Array.isArray(response)) return response;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response.events)
  if (Array.isArray(response.events)) return response.events;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response.items)
  if (Array.isArray(response.items)) return response.items;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response.incidents)
  if (Array.isArray(response.incidents)) return response.incidents;

  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = response.data;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(data)
  if (Array.isArray(data)) return data;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: data && Array.isArray(data.events)
  if (data && Array.isArray(data.events)) return data.events;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: data && Array.isArray(data.items)
  if (data && Array.isArray(data.items)) return data.items;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: data && Array.isArray(data.incidents)
  if (data && Array.isArray(data.incidents)) return data.incidents;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: []
  return [];
}

// 코드 설명: fetchRecentIncidentEvents 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function fetchRecentIncidentEvents(limit = 30): Promise<RealtimeIncidentEvent[]> {
  // 코드 설명: params 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
  const params = new URLSearchParams({ limit: String(limit) });
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RecentIncidentEventsApiResponse>(`/api/realtime/incidents/recent?${params.toString()}`);

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeRecentIncidentEvents(response)
  return normalizeRecentIncidentEvents(response);
}

// 코드 설명: normalizeRealtimeEventPreviews 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeRealtimeEventPreviews(response: RealtimeEventPreviewApiResponse): RealtimeEventPreview[] {
  // 코드 설명: items 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  let items: RealtimeEventPreview[] | undefined;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response)
  if (Array.isArray(response)) items = response;
  else if (Array.isArray(response.items)) items = response.items;
  else if (Array.isArray(response.events)) items = response.events;
  else {
    // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const data = response.data;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(data)
    if (Array.isArray(data)) items = data;
    else if (data && Array.isArray(data.items)) items = data.items;
    else if (data && Array.isArray(data.events)) items = data.events;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !items
  if (!items) throw new Error("응답 형식 오류: 실시간 이벤트 배열이 없습니다.");
  // 코드 설명: invalid 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const invalid = items.some((item) => !item || item.realtime_event_id === undefined || !item.event_type || !item.message);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: invalid
  if (invalid) throw new Error("응답 형식 오류: 실시간 이벤트 필수 필드가 누락되었습니다.");
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: items
  return items;
}

// 코드 설명: getRealtimeEventPreviews 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getRealtimeEventPreviews(limit = 5): Promise<RealtimeEventPreview[]> {
  // 코드 설명: params 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
  const params = new URLSearchParams({ limit: String(limit) });
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<RealtimeEventPreviewApiResponse>("/api/realtime/events/preview?" + params.toString());

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeRealtimeEventPreviews(response)
  return normalizeRealtimeEventPreviews(response);
}
