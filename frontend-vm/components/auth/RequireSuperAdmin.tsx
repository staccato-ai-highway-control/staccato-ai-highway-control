/**
 * 파일 역할: 인증 영역에서 사용하는 RequireSuperAdmin UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ReactNode } from "react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";

// 코드 설명: RequireSuperAdmin 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function RequireSuperAdmin({ children }: { children: ReactNode; title?: string }) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <SuperAdminGate>{children}</SuperAdminGate>
    </RequireAuth>
  );
}

// 코드 설명: SuperAdminGate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function SuperAdminGate({ children }: { children: ReactNode }) {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [isCheckingRole, setIsCheckingRole] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: user 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const user = getStoredAuthUser();
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(user);
    // 코드 설명: setIsCheckingRole 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsCheckingRole(false);

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: user?.role !== "SUPER_ADMIN"
    if (user?.role !== "SUPER_ADMIN") {
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.replace("/forbidden");
    }
  }, [router]);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isCheckingRole || authUser?.role !== "SUPER_ADMIN"
  if (isCheckingRole || authUser?.role !== "SUPER_ADMIN") {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <p className="text-sm font-semibold text-slate-500">접근 권한을 확인하는 중입니다.</p>
      </main>
    );
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: <>{children}</>
  return <>{children}</>;
}
