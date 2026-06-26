import { Card } from "@/components/common/Card";
import { RiskLevelBadge } from "./RiskLevelBadge";
import { IncidentStatusBadge } from "./IncidentStatusBadge";
import { incidentTypeLabels, type Incident } from "@/features/incidents/types";
import { formatConfidence, formatSeconds } from "@/lib/format";

export function IncidentDetailCard({ incident }: { incident: Incident }) {
  const rows = [
    ["이벤트 유형", incidentTypeLabels[incident.eventType]],
    ["위험 점수", String(incident.riskScore)],
    ["위험도", <RiskLevelBadge key="risk" level={incident.riskLevel} />],
    ["AI 신뢰도", formatConfidence(incident.confidence)],
    ["정차 지속 시간", formatSeconds(incident.stoppedDurationSec)],
    ["ROI 유형", incident.roiType],
    ["움직임 변화량", `${incident.movementDeltaPx}px`],
    ["상태", <IncidentStatusBadge key="status" status={incident.status} />],
  ];

  return (
    <Card className="p-5">
      <h2 className="text-lg font-black">{incident.code}</h2>
      <p className="mt-1 text-sm text-slate-500">{incident.location}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={String(label)} className="rounded-lg bg-slate-50 p-3">
            <span className="text-xs font-bold text-slate-500">{label}</span>
            <div className="mt-1 font-bold text-slate-950">{value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
