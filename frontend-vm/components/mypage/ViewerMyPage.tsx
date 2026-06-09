import { QuickLinkGrid, RoleGuideCard } from "./RolePageShared";

export function ViewerMyPage() {
  return (
    <div className="grid gap-5">
      <RoleGuideCard
        title="일반 조회 계정"
        description="읽기 전용 계정입니다. 등록, 승인, 설정 변경 등 쓰기 작업은 제한됩니다."
        tone="slate"
      />
      <QuickLinkGrid
        links={[
          { href: "/dashboard", label: "대시보드 조회", description: "운영 현황을 조회합니다." },
          { href: "/cctvs", label: "CCTV 조회", description: "CCTV 정보를 조회합니다." },
          { href: "/map", label: "지도 조회", description: "지도 기반 위치 정보를 조회합니다." },
          { href: "/incidents", label: "이상상황 조회", description: "이상상황 상세를 조회합니다." },
        ]}
      />
    </div>
  );
}
