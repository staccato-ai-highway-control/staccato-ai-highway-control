import type { StatisticsDashboardData } from "@/features/statistics/types";

export const mockStatisticsData: StatisticsDashboardData = {
  summary: {
    totalIncidents: 128,
    averageHandlingTime: "8분 32초",
    criticalIncidentRate: 14.8,
    falsePositiveRate: 6.3,
  },
  incidentTypeDistribution: [
    { label: "주행차로 정차", value: 46, color: "#f97316" },
    { label: "갓길 정차", value: 38, color: "#14b8a6" },
    { label: "낙하물", value: 22, color: "#f59e0b" },
    { label: "보행자 진입", value: 12, color: "#ef4444" },
    { label: "역주행 의심", value: 10, color: "#64748b" },
  ],
  regionalCounts: [
    { label: "경기도", value: 42, color: "#0f766e" },
    { label: "강원도", value: 15, color: "#0f766e" },
    { label: "충청남도", value: 18, color: "#0f766e" },
    { label: "대전", value: 12, color: "#0f766e" },
    { label: "광주", value: 8, color: "#0f766e" },
    { label: "경상남도", value: 13, color: "#0f766e" },
  ],
  dailyTrend: [
    { date: "04.23", count: 11 },
    { date: "04.24", count: 17 },
    { date: "04.25", count: 14 },
    { date: "04.26", count: 23 },
    { date: "04.27", count: 19 },
    { date: "04.28", count: 27 },
    { date: "04.29", count: 17 },
  ],
  riskDistribution: [
    { label: "LOW", value: 31, color: "#22c55e" },
    { label: "MEDIUM", value: 48, color: "#f59e0b" },
    { label: "HIGH", value: 30, color: "#f97316" },
    { label: "CRITICAL", value: 19, color: "#ef4444" },
  ],
};
