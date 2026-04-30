import { AppLayout } from "@/components/layout/AppLayout";
import { ReportUploadForm } from "@/components/report/ReportUploadForm";

export default function ReportCreatePage() {
  return (
    <AppLayout title="신고/영상 등록">
      <ReportUploadForm />
    </AppLayout>
  );
}
