/**
 * 파일 역할: 마이페이지 영역에서 사용하는 PendingApprovalMyPage UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/config/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getRoleLabel } from "@/config/navigation";

// 코드 설명: PendingApprovalMyPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function PendingApprovalMyPage({ user }: { user: AuthUser | null }) {
  // 코드 설명: requestedRole 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const requestedRole = user?.requested_role ?? user?.role;
  // 코드 설명: isEmailVerified 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isEmailVerified = Boolean(user?.is_email_verified || user?.email_verified_at);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <h3 className="text-lg font-black">승인 대기 중</h3>
      <p className="mt-2 text-sm font-semibold leading-6">
        관리자 승인 후 권한에 맞는 메뉴를 사용할 수 있습니다. 승인 전에는 관리자,
        관제, 출동 메뉴가 숨김 처리됩니다.
      </p>

      <dl className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-white/70 p-4">
          <dt className="text-xs font-bold text-amber-700">신청한 권한</dt>
          <dd className="mt-1 text-sm font-black">
            {getRoleLabel(requestedRole)}
          </dd>
        </div>
        <div className="rounded-lg bg-white/70 p-4">
          <dt className="text-xs font-bold text-amber-700">이메일 인증 여부</dt>
          <dd className="mt-1 text-sm font-black">
            {isEmailVerified ? "완료" : "미완료"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
