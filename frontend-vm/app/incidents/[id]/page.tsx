import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { DetectionEvidence } from "@/components/incident/DetectionEvidence";
import { IncidentDetailCard } from "@/components/incident/IncidentDetailCard";
import { IncidentMemoBox } from "@/components/incident/IncidentMemoBox";
import { IncidentStatusChanger } from "@/components/incident/IncidentStatusChanger";
import { getIncident } from "@/features/incidents/api";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await getIncident(id);

  return (
    <RequireAuth>
      <AppLayout title="이벤트 상세">
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
            <h2 className="mb-3 font-black">AI 탐지 결과</h2>
            <p className="text-sm font-semibold leading-6 text-slate-500">
              Snapshot, 탐지 신뢰도, ITS 정보와 관리자 메모를 기준으로 이벤트 상태를 변경합니다.
            </p>
          </Card>
        </div>
      </div>
      </AppLayout>
    </RequireAuth>
  );
}
