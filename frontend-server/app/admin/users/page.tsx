import Link from "next/link";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";

const users = [
  { name: "김관리", email: "kim.control@its.go.kr", role: "SUPER_ADMIN", department: "교통관제센터", status: "활성" },
  { name: "이순찰", email: "lee.patrol@its.go.kr", role: "CONTROL_ADMIN", department: "1팀", status: "활성" },
  { name: "박정비", email: "park.maint@its.go.kr", role: "MAINTAINER", department: "시설관리팀", status: "활성" },
];

export default function AdminUsersPage() {
  return (
    <RequireAuth>
      <AppLayout title="사용자 관리">
        <div className="mb-4 flex gap-2">
          <Link href="/admin/signup-requests" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 no-underline">
            가입 승인 관리
          </Link>
          <Link href="/admin/security-logs" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 no-underline">
            보안 로그
          </Link>
        </div>
        <Card className="overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-4">이름</th>
                <th>이메일</th>
                <th>역할</th>
                <th>부서</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email} className="border-t border-slate-100">
                  <td className="p-4 font-bold">{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <Badge tone="blue">{user.role}</Badge>
                  </td>
                  <td>{user.department}</td>
                  <td>
                    <Badge tone="green">{user.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
