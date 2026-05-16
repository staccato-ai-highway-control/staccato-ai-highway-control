import type { IncidentType, RiskLevel } from "@/features/incidents/types";

export type StatisticsPeriod = "TODAY" | "7_DAYS" | "30_DAYS" | "90_DAYS";
export type StatisticsRegion = "ALL" | "경기도" | "강원도" | "충청남도" | "대전" | "광주" | "경상남도";

export type StatisticsFilters = {
  period: StatisticsPeriod;
  incidentType: IncidentType | "ALL";
  region: StatisticsRegion;
  riskLevel: RiskLevel | "ALL";
};

export type StatisticsSummary = {
  totalIncidents: number;
  averageHandlingTime: string;
  criticalIncidentRate: number;
  falsePositiveRate: number;
};

export type StatisticsChartItem = {
  label: string;
  value: number;
  color: string;
};

export type DailyIncidentTrend = {
  date: string;
  count: number;
};

export type StatisticsDashboardData = {
  summary: StatisticsSummary;
  incidentTypeDistribution: StatisticsChartItem[];
  regionalCounts: StatisticsChartItem[];
  dailyTrend: DailyIncidentTrend[];
  riskDistribution: StatisticsChartItem[];
};
