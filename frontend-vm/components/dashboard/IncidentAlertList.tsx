import Link from "next/link";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import { mockIncidents } from "@/features/incidents/mock";
import { incidentTypeLabels } from "@/features/incidents/types";

export function IncidentAlertList() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-100">
      {mockIncidents.map((incident) => (
        <Link
          key={incident.id}
          href={`/incidents/${incident.id}`}
          className="grid gap-2 border-b border-slate-100 p-4 text-slate-900 no-underline last:border-b-0 md:grid-cols-[1fr_auto_auto] md:items-center"
        >
          <div>
            <b>{incident.code}</b>
            <p className="mt-1 text-sm text-slate-500">
              {incidentTypeLabels[incident.eventType]} · {incident.location}
            </p>
          </div>
          <RiskLevelBadge level={incident.riskLevel} />
          <IncidentStatusBadge status={incident.status} />
        </Link>
      ))}
    </div>
  );
}
