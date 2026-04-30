import { AppLayout } from "@/components/layout/AppLayout";
import { RiskSummaryCards } from "@/components/dashboard/RiskSummaryCards";
import { IncidentAlertList } from "@/components/dashboard/IncidentAlertList";
import { CctvGrid } from "@/components/dashboard/CctvGrid";
import { DetectionChart } from "@/components/dashboard/DetectionChart";
import { MVP_DESCRIPTION } from "@/lib/constants";

export default function DashboardPage() {
  return (
    <AppLayout title="통합 관제 대시보드">
      <p className="mb-5 text-sm font-semibold text-slate-500">{MVP_DESCRIPTION}</p>
      <RiskSummaryCards />
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="mb-3 text-lg font-black">최근 정차 이벤트 목록</h2>
          <IncidentAlertList />
        </div>
        <DetectionChart />
      </section>
      <section className="mt-5">
        <h2 className="mb-3 text-lg font-black">CCTV AI 감시 상태</h2>
        <CctvGrid />
      </section>
    </AppLayout>
  );
}
