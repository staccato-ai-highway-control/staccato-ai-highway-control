import { Badge } from "@/components/common/Badge";
import { riskLevelLabels, type RiskLevel } from "@/features/incidents/types";

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const tone = level === "CRITICAL" ? "red" : level === "HIGH" ? "amber" : level === "MEDIUM" ? "blue" : "green";
  return <Badge tone={tone}>{riskLevelLabels[level]}</Badge>;
}

