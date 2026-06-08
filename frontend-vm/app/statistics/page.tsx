import { BarChart3 } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";

export default function StatisticsPage() {
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
