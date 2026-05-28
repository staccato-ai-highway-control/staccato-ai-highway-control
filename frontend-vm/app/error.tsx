"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/common/ErrorPage";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      statusCode={500}
      title="화면을 불러오는 중 문제가 발생했습니다"
      description="일시적인 오류이거나 서버 응답 처리 중 문제가 발생했습니다."
      actionLabel="다시 시도"
      actionHref={undefined}
      onAction={reset}
      secondaryActionLabel="대시보드로 이동"
      secondaryActionHref="/dashboard"
    />
  );
}
