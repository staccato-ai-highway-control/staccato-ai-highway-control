/**
 * 파일 역할: CCTV 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/cctv/CctvPlayer 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { CctvPlayer } from "@/components/cctv/CctvPlayer";
// 코드 설명: @/components/cctv/RoiOverlay 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RoiOverlay } from "@/components/cctv/RoiOverlay";
// 코드 설명: @/components/cctv/AiDetectionOverlay 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AiDetectionOverlay } from "@/components/cctv/AiDetectionOverlay";
// 코드 설명: @/features/cctvs/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getCctv } from "@/features/cctvs/api";

// 코드 설명: CctvDetailPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default async function CctvDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 코드 설명: { id } 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const { id } = await params;
  // 코드 설명: cctv 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const cctv = await getCctv(id);
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <AppLayout title="CCTV 상세">
        <div className="relative">
          <CctvPlayer cctv={cctv} />
          <RoiOverlay />
          <AiDetectionOverlay />
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
