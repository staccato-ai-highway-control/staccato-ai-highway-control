import type { AuthUser } from "@/features/auth/types";
import { getRoleLabel } from "@/config/navigation";

export function PendingApprovalMyPage({ user }: { user: AuthUser | null }) {
  const requestedRole = user?.requested_role ?? user?.role;
  const isEmailVerified = Boolean(user?.is_email_verified || user?.email_verified_at);

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
