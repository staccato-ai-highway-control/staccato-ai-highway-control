import { RequireAuth } from "@/components/auth/RequireAuth";
import { BugReportDetail } from "@/components/bug-reports/BugReportDetail";

export default function BugReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <RequireAuth><BugReportDetail params={params} /></RequireAuth>;
}
