"use client";

import { AlertOctagon, BarChart3, Clock3, ShieldAlert, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { mockStatisticsData } from "@/features/statistics/mock";
import type { StatisticsFilters } from "@/features/statistics/types";
import { incidentTypeLabels, riskLevelLabels } from "@/features/incidents/types";

const periodLabels: Record<StatisticsFilters["period"], string> = {
  TODAY: "오늘",
  "7_DAYS": "최근 7일",
  "30_DAYS": "최근 30일",
  "90_DAYS": "최근 90일",
};

const regions: StatisticsFilters["region"][] = ["ALL", "경기도", "강원도", "충청남도", "대전", "광주", "경상남도"];

const statCards = [
  { key: "totalIncidents", label: "총 사고 수", icon: BarChart3, tone: "text-teal-700", bg: "bg-teal-50" },
  { key: "averageHandlingTime", label: "평균 처리 시간", icon: Clock3, tone: "text-sky-700", bg: "bg-sky-50" },
  { key: "criticalIncidentRate", label: "긴급 사고 비율", icon: ShieldAlert, tone: "text-red-700", bg: "bg-red-50", suffix: "%" },
  { key: "falsePositiveRate", label: "오탐 비율", icon: Target, tone: "text-amber-700", bg: "bg-amber-50", suffix: "%" },
] as const;

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      >
        {children}
      </select>
    </label>
  );
}

function DonutChart({ title, data }: { title: string; data: typeof mockStatisticsData.incidentTypeDistribution }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const gradient = data
    .map((item, index) => {
      const start = data.slice(0, index).reduce((sum, current) => sum + current.value, 0);
      const end = start + item.value;
      return `${item.color} ${(start / total) * 100}% ${(end / total) * 100}%`;
    })
    .join(", ");

  return (
    <Card className="p-5">
      <h3 className="text-base font-black text-slate-950">{title}</h3>
      <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-center">
        <div className="grid h-44 w-44 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
            <span className="text-xl font-black text-slate-950">{total}</span>
          </div>
        </div>
        <div className="grid w-full gap-3">
          {data.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-semibold text-slate-600">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <b className="text-slate-950">{item.value}건</b>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function HorizontalBarChart({ title, data }: { title: string; data: typeof mockStatisticsData.regionalCounts }) {
  const max = Math.max(...data.map((item) => item.value));

  return (
    <Card className="p-5">
      <h3 className="text-base font-black text-slate-950">{title}</h3>
      <div className="mt-6 grid gap-4">
        {data.map((item) => (
          <div key={item.label} className="grid grid-cols-[76px_minmax(0,1fr)_44px] items-center gap-3">
            <span className="text-sm font-semibold text-slate-600">{item.label}</span>
            <div className="h-5 overflow-hidden rounded bg-slate-100">
              <div className="h-full rounded bg-teal-700" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
            <b className="text-right text-sm text-slate-950">{item.value}</b>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TrendChart() {
  const max = Math.max(...mockStatisticsData.dailyTrend.map((item) => item.count));

  return (
    <Card className="p-5">
      <h3 className="text-base font-black text-slate-950">일자별 사고 추이</h3>
      <div className="mt-6 flex h-64 items-end gap-3 overflow-x-auto border-b border-slate-200 pb-4">
        {mockStatisticsData.dailyTrend.map((item) => (
          <div key={item.date} className="flex min-w-14 flex-1 flex-col items-center gap-3">
            <b className="text-xs text-slate-500">{item.count}</b>
            <div className="w-full rounded-t-lg bg-sky-500" style={{ height: `${Math.max(18, (item.count / max) * 180)}px` }} />
            <span className="text-xs font-semibold text-slate-500">{item.date}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function StatisticsPage() {
  const [filters, setFilters] = useState<StatisticsFilters>({
    period: "7_DAYS",
    incidentType: "ALL",
    region: "ALL",
    riskLevel: "ALL",
  });

  const summary = useMemo(() => mockStatisticsData.summary, []);

  function updateFilter<Key extends keyof StatisticsFilters>(key: Key, value: StatisticsFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <RequireAuth>
      <AppLayout title="통계 분석">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">통계 분석</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              사고 유형, 지역, 위험도, 처리 시간 통계를 확인합니다.
            </p>
          </div>
          <Badge tone="blue">mock 데이터 기준</Badge>
        </section>

        <Card className="mb-5 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="기간" value={filters.period} onChange={(value) => updateFilter("period", value as StatisticsFilters["period"])}>
              {Object.entries(periodLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectField>
            <SelectField label="사고 유형" value={filters.incidentType} onChange={(value) => updateFilter("incidentType", value as StatisticsFilters["incidentType"])}>
              <option value="ALL">전체</option>
              {Object.entries(incidentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectField>
            <SelectField label="지역" value={filters.region} onChange={(value) => updateFilter("region", value as StatisticsFilters["region"])}>
              {regions.map((region) => (
                <option key={region} value={region}>{region === "ALL" ? "전체" : region}</option>
              ))}
            </SelectField>
            <SelectField label="위험도" value={filters.riskLevel} onChange={(value) => updateFilter("riskLevel", value as StatisticsFilters["riskLevel"])}>
              <option value="ALL">전체</option>
              {Object.entries(riskLevelLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectField>
          </div>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            const rawValue = summary[card.key];
            const value = `${rawValue}${"suffix" in card ? card.suffix : ""}`;

            return (
              <Card key={card.key} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.tone}`} />
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{periodLabels[filters.period]}</span>
                </div>
                <strong className="mt-5 block text-3xl font-black text-slate-950">{value}</strong>
                <p className="mt-1 text-sm font-semibold text-slate-500">{card.label}</p>
              </Card>
            );
          })}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <DonutChart title="사고 유형별 분포" data={mockStatisticsData.incidentTypeDistribution} />
          <HorizontalBarChart title="지역별 발생 건수" data={mockStatisticsData.regionalCounts} />
          <TrendChart />
          <DonutChart title="위험도별 분포" data={mockStatisticsData.riskDistribution} />
        </section>

        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
          TODO: 추후 incidents, risk_context_snapshots 집계 API와 연결해 필터 조건별 통계를 조회합니다.
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
