import { RequireAuth } from "@/components/auth/RequireAuth";
import { BugReportForm } from "@/components/bug-reports/BugReportForm";

export default function NewBugReportPage() {
  return <RequireAuth><BugReportForm /></RequireAuth>;
}
