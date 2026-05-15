import { QuickLinkGrid, RoleGuideCard } from "./RolePageShared";

export function SuperAdminMyPage() {
  return (
    <div className="grid gap-5">
      <RoleGuideCard
        title="최고 관리자"
        description="전체 시스템 설정, 사용자 승인, 권한 관리와 보안 로그 확인을 담당합니다."
      />
      <QuickLinkGrid
        links={[
          { href: "/admin/signup-requests", label: "회원가입 신청 관리", description: "신규 계정 요청을 승인하거나 거절합니다." },
          { href: "/admin/users", label: "사용자 관리", description: "운영 계정 목록과 상태를 확인합니다." },
          { href: "/admin/security-logs", label: "보안 로그", description: "로그인과 보안 이벤트를 확인합니다." },
          { href: "/settings", label: "시스템 설정", description: "운영 환경 설정을 관리합니다." },
        ]}
      />
    </div>
  );
}
