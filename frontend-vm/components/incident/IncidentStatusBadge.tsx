import { Badge } from "@/components/common/Badge";
import { incidentStatusLabels, type IncidentStatus } from "@/features/incidents/types";

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const tone =
    status === "RESOLVED" || status === "CLOSED"
      ? "green"
      : status === "FALSE_POSITIVE"
        ? "slate"
        : status === "DETECTED"
          ? "red"
          : status === "ASSIGNED"
            ? "amber"
            : "blue";
  return <Badge tone={tone}>{incidentStatusLabels[status]}</Badge>;
}
