"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ReportUploadForm } from "@/components/report/ReportUploadForm";

export default function ReportCreatePage() {
  return (
    <RequireAuth>
      <AppLayout title="신고 등록">
        <ReportUploadForm />
      </AppLayout>
    </RequireAuth>
  );
}
