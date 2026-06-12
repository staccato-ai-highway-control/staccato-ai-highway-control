/**
 * 파일 역할: 통계 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
import type { IncidentType, RiskLevel } from "@/features/incidents/types";

// 코드 설명: StatisticsPeriod 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type StatisticsPeriod = "TODAY" | "7_DAYS" | "30_DAYS" | "90_DAYS";
// 코드 설명: StatisticsRegion 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type StatisticsRegion = "ALL" | "경기도" | "강원도" | "충청남도" | "대전" | "광주" | "경상남도";

// 코드 설명: StatisticsFilters 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type StatisticsFilters = {
  period: StatisticsPeriod;
  incidentType: IncidentType | "ALL";
  region: StatisticsRegion;
  riskLevel: RiskLevel | "ALL";
};

// 코드 설명: StatisticsSummary 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type StatisticsSummary = {
  totalIncidents: number;
  averageHandlingTime: string;
  criticalIncidentRate: number;
  falsePositiveRate: number;
};

// 코드 설명: StatisticsChartItem 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type StatisticsChartItem = {
  label: string;
  value: number;
  color: string;
};

// 코드 설명: DailyIncidentTrend 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type DailyIncidentTrend = {
  date: string;
  count: number;
};

// 코드 설명: StatisticsDashboardData 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type StatisticsDashboardData = {
  summary: StatisticsSummary;
  incidentTypeDistribution: StatisticsChartItem[];
  regionalCounts: StatisticsChartItem[];
  dailyTrend: DailyIncidentTrend[];
  riskDistribution: StatisticsChartItem[];
};
