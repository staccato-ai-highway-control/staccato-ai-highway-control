import Link from "next/link";
import { IncidentStatusBadge } from "./IncidentStatusBadge";
import { RiskLevelBadge } from "./RiskLevelBadge";
import { incidentTypeLabels, type Incident } from "@/features/incidents/types";
import { formatConfidence, formatSeconds } from "@/lib/format";

export function IncidentListTable({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1080px] border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            {["사건 코드", "이벤트 유형", "위치", "위험도", "AI 신뢰도", "정차 시간", "상태", "탐지 시각", "상세"].map((head) => (
              <th key={head} className="p-4">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id} className="border-t border-slate-100">
              <td className="p-4 font-bold">{incident.code}</td>
              <td>{incidentTypeLabels[incident.eventType]}</td>
              <td>{incident.location}</td>
              <td>
                <RiskLevelBadge level={incident.riskLevel} />
              </td>
              <td>{formatConfidence(incident.confidence)}</td>
              <td>{formatSeconds(incident.stoppedDurationSec)}</td>
              <td>
                <IncidentStatusBadge status={incident.status} />
              </td>
              <td>{incident.detectedAt}</td>
              <td>
                <Link href={`/incidents/${incident.id}`} className="font-bold text-staccato">
                  상세보기
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
