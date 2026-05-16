import { Card } from "@/components/common/Card";
import { mockIncidents } from "@/features/incidents/mock";
import { formatPercent } from "@/lib/format";

export function RiskSummaryCards() {
  const laneStops = mockIncidents.filter((item) => item.eventType === "LANE_STOP").length;
  const shoulderStops = mockIncidents.filter((item) => item.eventType === "SHOULDER_STOP").length;
  const critical = mockIncidents.filter((item) => item.riskLevel === "CRITICAL").length;
  const avgConfidence = mockIncidents.reduce((sum, item) => sum + item.confidence, 0) / mockIncidents.length;
  const cards = [
    ["오늘 정차 이벤트", String(mockIncidents.length)],
    ["주행차로 정차", String(laneStops)],
    ["갓길 정차", String(shoulderStops)],
    ["긴급 위험도", String(critical)],
    ["평균 AI 신뢰도", formatPercent(avgConfidence * 100)],
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map(([label, value]) => (
        <Card key={label} className="p-5">
          <strong className="text-2xl font-black text-slate-950">{value}</strong>
          <p className="mt-2 text-sm font-semibold text-slate-500">{label}</p>
        </Card>
      ))}
    </section>
  );
}
