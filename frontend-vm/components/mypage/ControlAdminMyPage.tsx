import { QuickLinkGrid, RoleGuideCard } from "./RolePageShared";

export function ControlAdminMyPage() {
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
