"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparisonMetricKey, DisplayComparisonMetric } from "./comparisonTypes";

type ComparisonMetricChartProps = {
  metrics: DisplayComparisonMetric[];
  jobIds: string[];
};

const BAR_COLORS = ["#dc2626", "#2563eb", "#d97706", "#059669", "#7c3aed"];

export function ComparisonMetricChart({ metrics, jobIds }: ComparisonMetricChartProps) {
  const [selectedMetricKey, setSelectedMetricKey] = useState<ComparisonMetricKey>(metrics[0]?.key ?? "avg_confidence");
  const selectedMetric = metrics.find((metric) => metric.key === selectedMetricKey) ?? metrics[0];

  useEffect(() => {
    if (!metrics.some((metric) => metric.key === selectedMetricKey) && metrics[0]) {
      setSelectedMetricKey(metrics[0].key);
    }
  }, [metrics, selectedMetricKey]);

  const chartData = useMemo(() => {
    if (!selectedMetric) return [];
    return jobIds.map((jobId) => {
      const rawValue = selectedMetric.values[jobId];
      return {
        jobId: `Job ${jobId}`,
        value: rawValue === null || rawValue === undefined ? null : selectedMetric.type === "confidence" ? rawValue * 100 : rawValue,
      };
    });
  }, [jobIds, selectedMetric]);

  if (!selectedMetric) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h5 className="text-sm font-black text-slate-900">Job별 지표 비교</h5>
          <p className="mt-1 text-xs font-semibold text-slate-500">지표를 선택해 Job별 차이를 확인할 수 있습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="비교 지표 선택">
          {metrics.map((metric) => {
            const selected = metric.key === selectedMetric.key;
            return (
              <button
                key={metric.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedMetricKey(metric.key)}
                className={`min-h-9 rounded-lg border px-3 text-xs font-black transition ${selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {metric.label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedMetric.allSame ? (
        <p className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700">선택된 Job들의 {selectedMetric.label} 지표가 동일합니다.</p>
      ) : null}

      <div className="mt-4 h-72 min-w-[520px] overflow-hidden" aria-label={`${selectedMetric.label} 막대 그래프`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="jobId" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={selectedMetric.type === "confidence" ? [0, 100] : [0, "auto"]}
              tickFormatter={(value) => selectedMetric.type === "confidence" ? `${value}%` : String(value)}
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={selectedMetric.type !== "count"}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              formatter={(value) => [selectedMetric.type === "confidence" ? `${Number(value).toFixed(2)}%` : `${Math.round(Number(value)).toLocaleString("ko-KR")}건`, selectedMetric.label]}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={72}>
              {chartData.map((entry, index) => <Cell key={entry.jobId} fill={BAR_COLORS[index % BAR_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
