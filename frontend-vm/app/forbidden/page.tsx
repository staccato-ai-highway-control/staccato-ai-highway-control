import { ErrorPage } from "@/components/common/ErrorPage";

export default function ForbiddenPage() {
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
