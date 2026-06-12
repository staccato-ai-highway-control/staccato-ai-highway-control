/**
 * 파일 역할: api 관련 처리를 여러 기능에서 재사용할 수 있도록 제공하는 공통 유틸리티입니다.
 * 유지보수 참고: 호출 범위가 넓으므로 입력 경계값과 브라우저/서버 실행 환경 차이를 고려해 동작을 변경해야 합니다.
 */
import { apiClient } from "./apiClient";
// 코드 설명: @/features/incidents/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { IncidentStatus } from "@/features/incidents/types";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { LoginRequest, LoginResponse } from "@/features/auth/types";
// 코드 설명: @/features/auth/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { login } from "@/features/auth/api";
// 코드 설명: @/features/reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { uploadReport, type UploadReportPayload } from "@/features/reports/api";

// 코드 설명: 다른 모듈이 이 기능을 재사용할 수 있도록 공개 API로 다시 내보냅니다.
export { apiClient, login };

// 코드 설명: ReportPayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ReportPayload = UploadReportPayload;

// 코드 설명: fetchDashboardSummary 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function fetchDashboardSummary() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient("/api/dashboard/summary")
  return apiClient("/api/dashboard/summary");
}

// 코드 설명: fetchIncidents 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function fetchIncidents() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient("/api/incidents")
  return apiClient("/api/incidents");
}

// 코드 설명: fetchIncident 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function fetchIncident(id: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient(`/api/incidents/${id}`)
  return apiClient(`/api/incidents/${id}`);
}

// 코드 설명: updateIncidentStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function updateIncidentStatus(id: string, status: IncidentStatus) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<{ ok: boolean }>(`/api/incidents/${id}/status`, { method: "PU…
  return apiClient<{ ok: boolean }>(`/api/incidents/${id}/status`, { method: "PUT", body: { status } });
}

// 코드 설명: createReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function createReport(payload: UploadReportPayload) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: uploadReport(payload)
  return uploadReport(payload);
}

// 코드 설명: requestReportAnalysis 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function requestReportAnalysis(id: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: apiClient<{ ok: boolean }>(`/api/reports/${id}/analyze`, { method: "POS…
  return apiClient<{ ok: boolean }>(`/api/reports/${id}/analyze`, { method: "POST" });
}

// 코드 설명: 다른 모듈이 이 기능을 재사용할 수 있도록 공개 API로 다시 내보냅니다.
export type { LoginRequest, LoginResponse };
