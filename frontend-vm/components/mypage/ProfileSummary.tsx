import type { AuthUser } from "@/features/auth/types";
import { getRoleLabel } from "@/config/navigation";

function getStatusLabel(status?: string) {
  const normalizedStatus = status?.toUpperCase();

  if (normalizedStatus === "ACTIVE") return "활성";
  if (normalizedStatus === "PENDING") return "승인 대기";
  if (normalizedStatus === "REJECTED") return "승인 거절";
  if (normalizedStatus === "DELETED") return "탈퇴";

  return status ?? "-";
}

export function ProfileSummary({ user }: { user: AuthUser | null }) {
  const rows = [
    ["이름", user?.name ?? "-"],
    ["로그인 ID", user?.login_id ?? "-"],
    ["이메일", user?.email ?? "-"],
    ["전화번호", user?.phone ?? "-"],
    ["권한", getRoleLabel(user?.role)],
    ["계정 상태", getStatusLabel(user?.account_status)],
    ["이메일 인증 여부", user?.is_email_verified || user?.email_verified_at ? "완료" : "미완료"],
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-900 text-xl font-black text-white">
          {(user?.name || user?.email || "S").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-slate-950">
            {user?.name ?? "사용자"}
          </h3>
          <p className="mt-1 truncate text-sm font-semibold text-slate-500">
            {user?.email ?? "계정 정보를 불러오는 중입니다."}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-bold text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-bold text-slate-950">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
