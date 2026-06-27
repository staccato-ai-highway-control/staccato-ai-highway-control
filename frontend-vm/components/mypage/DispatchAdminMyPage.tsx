/**
 * 파일 역할: 마이페이지 영역에서 사용하는 DispatchAdminMyPage UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import { QuickLinkGrid, RoleGuideCard } from "./RolePageShared";

// 코드 설명: DispatchAdminMyPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function DispatchAdminMyPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
