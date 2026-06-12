/**
 * 파일 역할: forbidden 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
import { ErrorPage } from "@/components/common/ErrorPage";

// 코드 설명: ForbiddenPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function ForbiddenPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <ErrorPage
      statusCode={403}
      title="접근 권한이 없습니다"
      description="현재 계정 권한으로는 이 페이지에 접근할 수 없습니다."
      actionLabel="대시보드로 이동"
      actionHref="/dashboard"
      secondaryActionLabel="이전 페이지로 돌아가기"
    />
  );
}
