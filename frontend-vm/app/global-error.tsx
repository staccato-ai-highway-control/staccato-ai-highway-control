/**
 * 파일 역할: Next.js 라우팅 과정에서 발생하는 예외 또는 찾을 수 없는 경로를 사용자 친화적인 화면으로 표시합니다.
 * 유지보수 참고: 정상 페이지 렌더링이 실패한 상황에서도 동작해야 하므로 의존성과 부수 효과를 최소화합니다.
 */
"use client";

// 코드 설명: @/components/common/ErrorPage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ErrorPage } from "@/components/common/ErrorPage";
// 코드 설명: ./globals.css 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import "./globals.css";

// 코드 설명: GlobalError 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: console.error(error);
  console.error(error);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <html lang="ko">
      <body>
        <ErrorPage
          statusCode={500}
          title="서비스 오류가 발생했습니다"
          description="페이지를 표시할 수 없습니다. 잠시 후 다시 시도해 주세요."
          actionLabel="새로고침"
          actionHref={undefined}
          onAction={() => window.location.reload()}
          secondaryActionLabel="로그인으로 이동"
          secondaryActionHref="/login"
        />
      </body>
    </html>
  );
}
