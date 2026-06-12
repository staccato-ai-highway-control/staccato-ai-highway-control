/**
 * 파일 역할: 돌발 상황 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Incident, IncidentStatus } from "./types";

// 코드 설명: UploadIncidentPayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type UploadIncidentPayload = {
  file: File;
  reportType?: string;
  title?: string;
  subject?: string;
  description?: string;
  fields?: Record<string, string | number | boolean | null | undefined>;
};

// 코드 설명: UploadIncidentResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type UploadIncidentResponse = {
  success?: boolean;
  report_id?: string | number;
  incident_id?: string | number;
  data?: unknown;
  message?: string;
};

// 코드 설명: ListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ListResponse = FlexibleApiResponse<Incident[]> | { incidents?: Incident[] };

// 코드 설명: getIncidentsHealth 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getIncidentsHealth() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient("/api/incidents/health", { auth: false })
  return apiClient("/api/incidents/health", { auth: false });
}

// 코드 설명: getIncidents 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getIncidents() {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<ListResponse>("/api/incidents");
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(response)
  if (Array.isArray(response)) return response;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: "incidents" in response && response.incidents
  if ("incidents" in response && response.incidents) return response.incidents;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<Incident[]>(response as FlexibleApiResponse<Incident[]>)
  return getEnvelopeData<Incident[]>(response as FlexibleApiResponse<Incident[]>);
}

// 코드 설명: getIncident 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getIncident(id: string) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<Incident>>('/api/incidents/' + id);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<Incident>(response)
  return getEnvelopeData<Incident>(response);
}

// 코드 설명: uploadIncident 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function uploadIncident(payload: UploadIncidentPayload) {
  // 코드 설명: formData FormData를 만들어 텍스트와 파일을 multipart 요청으로 함께 보냅니다.
  const formData = new FormData();
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: formData.append("file", payload.file);
  formData.append("file", payload.file);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: formData.append("report_type", payload.reportType ?? "ACCIDENT");
  formData.append("report_type", payload.reportType ?? "ACCIDENT");
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: formData.append("title", payload.title ?? payload.subject ?? "사고 신고");
  formData.append("title", payload.title ?? payload.subject ?? "사고 신고");
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: formData.append("subject", payload.subject ?? payload.title ?? "사고 신고");
  formData.append("subject", payload.subject ?? payload.title ?? "사고 신고");
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: payload.description
  if (payload.description) formData.append("description", payload.description);

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: Object.entries(payload.fields ?? {}).forEach(([key, value]) => { if (va…
  Object.entries(payload.fields ?? {}).forEach(([key, value]) => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value !== null && value !== undefined
    if (value !== null && value !== undefined) formData.append(key, String(value));
  });

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<UploadIncidentResponse>("/api/incidents", { method: "POST", f…
  return apiClient<UploadIncidentResponse>("/api/incidents", {
    method: "POST",
    formData,
  });
}

// 코드 설명: updateIncidentStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function updateIncidentStatus(id: string, status: IncidentStatus) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<{ ok?: boolean; success?: boolean }>('/api/incidents/' + id +…
  return apiClient<{ ok?: boolean; success?: boolean }>('/api/incidents/' + id + '/status', {
    method: "PATCH",
    body: { status },
  });
}
