/**
 * 파일 역할: 보고서 영역에서 사용하는 ComparisonMetricChart UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useState } from "react";
// 코드 설명: recharts 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
// 코드 설명: ./comparisonTypes 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ComparisonMetricKey, DisplayComparisonMetric } from "./comparisonTypes";

// 코드 설명: ComparisonMetricChartProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ComparisonMetricChartProps = {
  metrics: DisplayComparisonMetric[];
  jobIds: string[];
};

// 코드 설명: BAR_COLORS 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const BAR_COLORS = ["#dc2626", "#2563eb", "#d97706", "#059669", "#7c3aed"];

// 코드 설명: ComparisonMetricChart 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ComparisonMetricChart({ metrics, jobIds }: ComparisonMetricChartProps) {
  // 코드 설명: [selectedMetricKey, setSelectedMetricKey] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [selectedMetricKey, setSelectedMetricKey] = useState<ComparisonMetricKey>(metrics[0]?.key ?? "avg_confidence");
  // 코드 설명: selectedMetric 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const selectedMetric = metrics.find((metric) => metric.key === selectedMetricKey) ?? metrics[0];

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !metrics.some((metric) => metric.key === selectedMetricKey) && metrics[…
    if (!metrics.some((metric) => metric.key === selectedMetricKey) && metrics[0]) {
      // 코드 설명: setSelectedMetricKey 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSelectedMetricKey(metrics[0].key);
    }
  }, [metrics, selectedMetricKey]);

  // 코드 설명: chartData 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const chartData = useMemo(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !selectedMetric
    if (!selectedMetric) return [];
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: jobIds.map((jobId) => { const rawValue = selectedMetric.values[jobId]; …
    return jobIds.map((jobId) => {
      // 코드 설명: rawValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const rawValue = selectedMetric.values[jobId];
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { jobId: `Job ${jobId}`, value: rawValue === null || rawValue === undef…
      return {
        jobId: `Job ${jobId}`,
        value: rawValue === null || rawValue === undefined ? null : selectedMetric.type === "confidence" ? rawValue * 100 : rawValue,
      };
    });
  }, [jobIds, selectedMetric]);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !selectedMetric
  if (!selectedMetric) return null;

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h5 className="text-sm font-black text-slate-900">Job별 지표 비교</h5>
          <p className="mt-1 text-xs font-semibold text-slate-500">지표를 선택해 Job별 차이를 확인할 수 있습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="비교 지표 선택">
          {metrics.map((metric) => {
            // 코드 설명: selected 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const selected = metric.key === selectedMetric.key;
            // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
