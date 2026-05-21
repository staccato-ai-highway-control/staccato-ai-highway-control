"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PendingApprovalMyPage } from "@/components/mypage/PendingApprovalMyPage";
import { ProfileSummary } from "@/components/mypage/ProfileSummary";
import { SecurityCard } from "@/components/mypage/SecurityCard";
import { SuperAdminMyPage } from "@/components/mypage/SuperAdminMyPage";
import type { AuthUser } from "@/features/auth/types";
import { clearStoredAuth, getStoredAuthUser } from "@/lib/authStorage";

function RoleContent({ user }: { user: AuthUser | null }) {
  if (user?.account_status?.toUpperCase() === "PENDING") {
    return <PendingApprovalMyPage user={user} />;
  }

  if (user?.role) return <SuperAdminMyPage />;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">계정 확인 필요</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        /auth/me 응답의 계정 정보를 확인할 수 없습니다. 관리자에게 문의해주세요.
      </p>
    </section>
  );
}

export default function MyPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  function handleLogout() {
    clearStoredAuth();
    router.replace("/login");
  }

  return (
    <RequireAuth>
      <AppLayout title="마이페이지">
        <section className="grid gap-5">
          <div>
            <p className="text-sm font-bold tracking-[0.18em] text-sky-600">
              MY PAGE
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              마이페이지
            </h2>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div className="grid content-start gap-5">
              <ProfileSummary user={authUser} />
              <SecurityCard onLogout={handleLogout} />
            </div>
            <RoleContent user={authUser} />
          </div>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
