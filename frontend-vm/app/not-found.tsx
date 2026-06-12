/**
 * 파일 역할: Next.js 라우팅 과정에서 발생하는 예외 또는 찾을 수 없는 경로를 사용자 친화적인 화면으로 표시합니다.
 * 유지보수 참고: 정상 페이지 렌더링이 실패한 상황에서도 동작해야 하므로 의존성과 부수 효과를 최소화합니다.
 */
import { ErrorPage } from "@/components/common/ErrorPage";

// 코드 설명: NotFound 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function NotFound() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <ErrorPage
      statusCode={404}
      title="페이지를 찾을 수 없습니다"
      description="요청한 페이지가 존재하지 않거나 이동되었습니다."
      actionLabel="대시보드로 이동"
      actionHref="/dashboard"
      secondaryActionLabel="이전 페이지로 돌아가기"
    />
  );
}
