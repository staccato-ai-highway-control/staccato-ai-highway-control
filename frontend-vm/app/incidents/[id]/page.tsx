import Link from "next/link";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { DetectionEvidence } from "@/components/incident/DetectionEvidence";
import { IncidentDetailCard } from "@/components/incident/IncidentDetailCard";
import { IncidentMemoBox } from "@/components/incident/IncidentMemoBox";
import { IncidentStatusChanger } from "@/components/incident/IncidentStatusChanger";
import { GenerateReportButton } from "@/components/llm/GenerateReportButton";
import { getIncident } from "@/features/incidents/api";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await getIncident(id);

  return (
    <RequireAuth>
      <AppLayout title="사건 상세">
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-5">
          <DetectionEvidence incident={incident} />
          <IncidentDetailCard incident={incident} />
        </div>
        <div className="grid content-start gap-5">
          <Card className="p-5">
            <h2 className="mb-3 font-black">ITS 정보</h2>
            <p>날씨: {incident.its.weather}</p>
            <p>교통량: {incident.its.trafficVolume}</p>
            <p>순찰 예상: {incident.its.nearestPatrolEta}</p>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-black">상태 변경</h2>
            <IncidentStatusChanger incidentId={incident.id} initialStatus={incident.status} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-black">관리자 메모</h2>
            <IncidentMemoBox memo={incident.memo} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-black">LLM 보고서 생성 모듈</h2>
            <GenerateReportButton incidentId={incident.id} />
            <Link href="/llm-reports/llm-001" className="mt-3 inline-flex text-sm font-bold text-staccato">
              생성된 보고서 보기
            </Link>
          </Card>
        </div>
      </div>
      </AppLayout>
    </RequireAuth>
  );
}
