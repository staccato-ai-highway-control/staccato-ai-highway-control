/**
 * 파일 역할: 마이페이지 영역에서 사용하는 ProfileSummary UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/config/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getRoleLabel } from "@/config/navigation";

// 코드 설명: getStatusLabel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getStatusLabel(status?: string) {
  // 코드 설명: normalizedStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const normalizedStatus = status?.toUpperCase();

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: normalizedStatus === "ACTIVE"
  if (normalizedStatus === "ACTIVE") return "활성";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: normalizedStatus === "PENDING"
  if (normalizedStatus === "PENDING") return "승인 대기";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: normalizedStatus === "REJECTED"
  if (normalizedStatus === "REJECTED") return "승인 거절";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: normalizedStatus === "DELETED"
  if (normalizedStatus === "DELETED") return "탈퇴";

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: status ?? "-"
  return status ?? "-";
}

// 코드 설명: ProfileSummary 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ProfileSummary({ user }: { user: AuthUser | null }) {
  // 코드 설명: rows 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const rows = [
    ["이름", user?.name ?? "-"],
    ["로그인 ID", user?.login_id ?? "-"],
    ["이메일", user?.email ?? "-"],
    ["전화번호", user?.phone ?? "-"],
    ["권한", getRoleLabel(user?.role)],
    ["계정 상태", getStatusLabel(user?.account_status)],
    ["이메일 인증 여부", user?.is_email_verified || user?.email_verified_at ? "완료" : "미완료"],
  ];

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
