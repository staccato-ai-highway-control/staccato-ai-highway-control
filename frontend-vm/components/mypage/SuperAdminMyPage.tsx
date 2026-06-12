/**
 * 파일 역할: 마이페이지 영역에서 사용하는 SuperAdminMyPage UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import { QuickLinkGrid, RoleGuideCard } from "./RolePageShared";

// 코드 설명: SuperAdminMyPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function SuperAdminMyPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="grid gap-5">
      <RoleGuideCard
        title="최고 관리자"
        description="통합 관제, 사용자 승인, 시스템 상태와 실시간 이벤트 흐름을 확인합니다."
      />
      <QuickLinkGrid
        links={[
          { href: "/admin/signup-requests", label: "회원가입 신청 관리", description: "신규 계정 요청을 승인하거나 거절합니다." },
          { href: "/admin/users", label: "사용자 관리", description: "운영 계정 목록과 승인 상태를 확인합니다." },
          { href: "/admin/security-logs", label: "보안 로그", description: "로그인과 보안 이벤트를 확인합니다." },
          { href: "/settings", label: "운영 환경 정보", description: "서버 환경변수와 배포 설정의 관리 정책을 확인합니다." },
        ]}
      />
    </div>
  );
}
