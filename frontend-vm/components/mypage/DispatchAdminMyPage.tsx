import { QuickLinkGrid, RoleGuideCard } from "./RolePageShared";

export function DispatchAdminMyPage() {
  return (
    <div className="grid gap-5">
      <RoleGuideCard
        title="출동 관리자"
        description="현장 출동, 위치 확인, 조치 보고와 결과 작성을 담당합니다."
        tone="amber"
      />
      <QuickLinkGrid
        links={[
          { href: "/dispatch/incidents", label: "내 출동 목록", description: "배정된 출동 사건을 확인하고 처리 결과를 작성합니다." },
          { href: "/dispatch/map", label: "지도/위치 확인", description: "내게 배정된 사건 위치와 이동 정보를 확인합니다." },
          { href: "/reports/create", label: "현장 조치 보고", description: "현장 조치 내용을 등록합니다." },
          { href: "/reports", label: "출동 결과 작성", description: "출동 처리 결과를 작성합니다." },
        ]}
      />
    </div>
  );
}
