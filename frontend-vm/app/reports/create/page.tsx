"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { ReportUploadForm } from "@/components/report/ReportUploadForm";
import type { AuthUser } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";

export default function ReportCreatePage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const canCreateReport =
    authUser?.role === "SUPER_ADMIN" || authUser?.role === "CONTROL_ADMIN";

  return (
    <RequireAuth>
      <AppLayout title="신고/영상 등록">
        {canCreateReport ? (
          <ReportUploadForm />
        ) : (
          <Card className="p-6">
            <h2 className="text-xl font-black text-slate-950">신고 등록 권한이 없습니다.</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              신고 영상/이미지 등록은 최고관리자와 관제관리자만 사용할 수 있습니다.
            </p>
          </Card>
        )}
      </AppLayout>
    </RequireAuth>
  );
}
