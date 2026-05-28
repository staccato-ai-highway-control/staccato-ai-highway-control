import { BugReportDetail } from "@/components/bug-reports/BugReportDetail";

export default function BugReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <BugReportDetail params={params} />;
}
