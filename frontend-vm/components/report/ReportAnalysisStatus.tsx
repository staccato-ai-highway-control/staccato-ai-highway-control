import { Badge } from "@/components/common/Badge";

export function ReportAnalysisStatus({ status }: { status: string }) {
  return <Badge tone={["COMPLETED"].includes(status) ? "green" : ["FAILED"].includes(status) ? "red" : status === "CANCELLED" ? "slate" : ["QUEUED", "RUNNING", "PROCESSING", "ANALYZING"].includes(status) ? "amber" : "blue"}>{status}</Badge>;
}

