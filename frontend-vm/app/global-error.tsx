"use client";

import { ErrorPage } from "@/components/common/ErrorPage";
import "./globals.css";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  console.error(error);

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
