/**
 * 파일 역할: 마이페이지 영역에서 사용하는 ViewerMyPage UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import { QuickLinkGrid, RoleGuideCard } from "./RolePageShared";

// 코드 설명: ViewerMyPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ViewerMyPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
