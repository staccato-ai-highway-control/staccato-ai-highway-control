/**
 * 파일 역할: 관리자 / users 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useState } from "react";
// 코드 설명: @/components/auth/RequireSuperAdmin 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/features/admin/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getAdminUsers } from "@/features/admin/api";
// 코드 설명: @/features/admin/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AdminUser } from "@/features/admin/types";

// 코드 설명: getStatusLabel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getStatusLabel(user: AdminUser) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: user.account_status ?? "-"
  return user.account_status ?? "-";
}

// 코드 설명: AdminUsersPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function AdminUsersPage() {
  // 코드 설명: [users, setUsers] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [users, setUsers] = useState<AdminUser[]>([]);
  // 코드 설명: [isLoading, setIsLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isLoading, setIsLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");

  // 코드 설명: loadUsers 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadUsers() {
    // 코드 설명: setIsLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");
    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setUsers 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setUsers(await getAdminUsers());
    } catch (error) {
      // 코드 설명: setUsers 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setUsers([]);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "사용자 목록을 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setIsLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsLoading(false);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadUsers();
    loadUsers();
  }, []);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
