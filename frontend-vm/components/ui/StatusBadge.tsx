import type { ReactNode } from "react";
import { Badge } from "@/components/common/Badge";

function toneFor(value: string) {
  const normalized = value.toUpperCase();
  if (["FAILED", "REJECTED", "DELETED", "FALSE_POSITIVE", "URGENT", "HIGH", "CRITICAL", "DETECTED"].includes(normalized)) return "red" as const;
  if (["COMPLETED", "APPROVED", "RESOLVED", "CLOSED", "CONVERTED_TO_INCIDENT", "LOW", "SYSTEM_NORMAL"].includes(normalized)) return "green" as const;
  if (["MEDIUM", "NORMAL", "ASSIGNED", "REALTIME", "QUEUED", "ANALYZING"].includes(normalized)) return "amber" as const;
  if (["PROCESSING", "RUNNING", "REQUESTED", "REVIEWING", "SUBMITTED", "WAITING"].includes(normalized)) return "blue" as const;
  return "slate" as const;
}

export function StatusBadge({ value, children }: { value: string; children?: ReactNode }) {
  return <Badge tone={toneFor(value)}>{children ?? value}</Badge>;
}
