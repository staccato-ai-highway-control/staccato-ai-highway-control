/**
 * 파일 역할: 통계 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
import { BarChart3 } from "lucide-react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";

// 코드 설명: StatisticsPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function StatisticsPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <AppLayout title="통계 분석">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">통계 분석</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">실제 집계 API가 연결되면 기간별, 유형별, 지역별 통계를 확인할 수 있습니다.</p>
          </div>
          <Badge tone="amber">API 미연결</Badge>
        </section>
        <Card className="p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-700"><BarChart3 className="h-6 w-6" aria-hidden="true" /></span>
          <h3 className="mt-5 text-lg font-black text-slate-950">통계 API가 아직 연결되지 않았습니다.</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">현재 화면에는 운영 수치나 예시 차트를 표시하지 않습니다. 실제 집계 API가 연결되면 조회 조건과 통계 결과가 활성화됩니다.</p>
          <div className="mx-auto mt-5 max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm font-semibold text-slate-600">필요한 데이터: 기간별 사고 추이, 사고 유형·지역·위험도 분포, 평균 처리 시간, 오탐 비율</div>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
