"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import type { AuthUser } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";

export function RequireSuperAdmin({ children, title = "관리자 페이지" }: { children: ReactNode; title?: string }) {
  return (
    <RequireAuth>
      <SuperAdminGate title={title}>{children}</SuperAdminGate>
    </RequireAuth>
  );
}

function SuperAdminGate({ children, title }: { children: ReactNode; title: string }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
    setIsCheckingRole(false);
  }, []);

  if (isCheckingRole) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <p className="text-sm font-semibold text-slate-500">접근 권한을 확인하는 중입니다.</p>
      </main>
    );
  }

  if (authUser?.role !== "SUPER_ADMIN") {
    return (
      <AppLayout title={title}>
        <Card className="p-8 text-center">
          <h2 className="text-xl font-black text-slate-950">접근 권한이 없습니다.</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            이 페이지는 최고관리자만 접근할 수 있습니다.
          </p>
        </Card>
      </AppLayout>
    );
  }

  return <>{children}</>;
}
