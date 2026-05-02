import { Badge } from "@/components/common/Badge";

export function ReportAnalysisStatus({ status }: { status: string }) {
  return <Badge tone={status === "COMPLETED" ? "green" : status === "FAILED" ? "red" : "blue"}>{status}</Badge>;
}

