import { ErrorPage } from "@/components/common/ErrorPage";

export default function UnauthorizedPage() {
  return (
    <ErrorPage
      statusCode={401}
      title="로그인이 필요합니다"
      description="이 페이지에 접근하려면 먼저 로그인해야 합니다."
      actionLabel="로그인으로 이동"
      actionHref="/login"
      secondaryActionLabel=""
    />
  );
}
