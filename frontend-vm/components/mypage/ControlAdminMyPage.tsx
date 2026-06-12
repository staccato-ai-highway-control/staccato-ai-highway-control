/**
 * 파일 역할: 마이페이지 영역에서 사용하는 ControlAdminMyPage UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import { QuickLinkGrid, RoleGuideCard } from "./RolePageShared";

// 코드 설명: ControlAdminMyPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ControlAdminMyPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="grid gap-5">
      <RoleGuideCard
        title="관제 관리자"
        description="CCTV, 지도, 이상상황과 출동 요청 흐름을 모니터링합니다."
        tone="green"
      />
      <QuickLinkGrid
        links={[
          { href: "/cctvs", label: "CCTV 관제", description: "CCTV 상태와 탐지 화면을 확인합니다." },
          { href: "/map", label: "지도 모니터링", description: "사고 위치와 주변 상황을 봅니다." },
          { href: "/reports", label: "이상상황/신고 관리", description: "신고와 이상상황 처리 목록으로 이동합니다." },
          { href: "/incidents", label: "출동 요청 관리", description: "출동이 필요한 사건을 확인합니다." },
        ]}
      />
    </div>
  );
}
