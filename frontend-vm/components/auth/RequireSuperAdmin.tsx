"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import type { AuthUser } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";

export function RequireSuperAdmin({ children }: { children: ReactNode; title?: string }) {
  return (
    <RequireAuth>
      <SuperAdminGate>{children}</SuperAdminGate>
    </RequireAuth>
  );
}

function SuperAdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    const user = getStoredAuthUser();
    setAuthUser(user);
    setIsCheckingRole(false);

    if (user?.role !== "SUPER_ADMIN") {
      router.replace("/forbidden");
    }
  }, [router]);

  if (isCheckingRole || authUser?.role !== "SUPER_ADMIN") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <p className="text-sm font-semibold text-slate-500">접근 권한을 확인하는 중입니다.</p>
      </main>
    );
  }

  return <>{children}</>;
}
