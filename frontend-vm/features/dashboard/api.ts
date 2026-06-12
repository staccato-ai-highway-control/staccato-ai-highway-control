/**
 * 파일 역할: 대시보드 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";

// 코드 설명: DashboardSummaryResponse 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface DashboardSummaryResponse {
  // 코드 설명: success 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  success: boolean;
  // 코드 설명: data 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  data: {
    users: {
      total: number | null;
      pending_signup: number | null;
    };
    notifications: {
      unread_count: number;
    };
  };
}

// 코드 설명: DashboardSummary 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type DashboardSummary = DashboardSummaryResponse["data"];

// 코드 설명: getDashboardSummary 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getDashboardSummary() {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await apiClient<FlexibleApiResponse<DashboardSummary>>("/api/dashboard/summary");
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<DashboardSummary>(response)
  return getEnvelopeData<DashboardSummary>(response);
}
