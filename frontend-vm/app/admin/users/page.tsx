"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { getAdminUsers } from "@/features/admin/api";
import type { AdminUser } from "@/features/admin/types";

function getStatusLabel(user: AdminUser) {
  return user.account_status ?? "-";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadUsers() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      setUsers(await getAdminUsers());
    } catch (error) {
      setUsers([]);
      setErrorMessage(error instanceof Error ? error.message : "사용자 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <RequireSuperAdmin title="사용자 관리">
      <AppLayout title="사용자 관리">
        <div className="mb-4 flex gap-2">
          <Link href="/admin/signup-requests" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 no-underline">가입 승인 관리</Link>
          <Link href="/admin/security-logs" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 no-underline">보안 로그</Link>
        </div>
        {errorMessage ? (
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <span>사용자 목록을 불러오지 못했습니다. {errorMessage}</span>
            <button type="button" onClick={loadUsers} className="h-9 rounded-lg border border-red-200 bg-white px-3 font-black text-red-700">다시 시도</button>
          </div>
        ) : null}
        <Card className="overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="p-4">이름</th><th>이메일</th><th>역할</th><th>부서</th><th>상태</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="p-8 text-center font-semibold text-slate-500">사용자 목록을 불러오는 중입니다.</td></tr> : null}
              {!isLoading && errorMessage ? <tr><td colSpan={5} className="p-8 text-center font-semibold text-red-600">API 오류로 사용자 데이터를 표시할 수 없습니다.</td></tr> : null}
              {!isLoading && !errorMessage && users.length === 0 ? <tr><td colSpan={5} className="p-8 text-center font-semibold text-slate-500">등록된 사용자가 없습니다.</td></tr> : null}
              {!isLoading && !errorMessage ? users.map((user) => (
                <tr key={`${user.id ?? user.email ?? user.login_id}-${user.role ?? "NO_ROLE"}`} className="border-t border-slate-100">
                  <td className="p-4 font-bold">{user.name ?? user.login_id ?? "-"}</td><td>{user.email ?? "-"}</td>
                  <td><Badge tone="blue">{user.role ?? "-"}</Badge></td><td>{user.department ?? "-"}</td><td><Badge tone="green">{getStatusLabel(user)}</Badge></td>
                </tr>
              )) : null}
            </tbody>
          </table>
        </Card>
      </AppLayout>
    </RequireSuperAdmin>
  );
}
