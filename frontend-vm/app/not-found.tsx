import { ErrorPage } from "@/components/common/ErrorPage";

export default function NotFound() {
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
