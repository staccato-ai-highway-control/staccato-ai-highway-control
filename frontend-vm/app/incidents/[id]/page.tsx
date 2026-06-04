"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { DetectionEvidence } from "@/components/incident/DetectionEvidence";
import { IncidentDetailCard } from "@/components/incident/IncidentDetailCard";
import { IncidentMemoBox } from "@/components/incident/IncidentMemoBox";
import { IncidentStatusChanger } from "@/components/incident/IncidentStatusChanger";
import { getIncident } from "@/features/incidents/api";
import type { Incident } from "@/features/incidents/types";

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadIncident() {
      if (!id) {
        setErrorMessage("이벤트 ID가 없습니다.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await getIncident(id);
        if (!cancelled) setIncident(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "이벤트 상세 정보를 불러오지 못했습니다.";
        if (!cancelled) setErrorMessage(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadIncident();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <RequireAuth>
      <AppLayout title="이벤트 상세">
        {isLoading ? (
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-500">이벤트 상세 정보를 불러오는 중입니다.</p>
          </Card>
        ) : errorMessage ? (
          <Card className="p-5">
            <h2 className="mb-2 font-black text-red-600">이벤트 상세 조회 실패</h2>
            <p className="text-sm font-semibold text-slate-500">{errorMessage}</p>
          </Card>
        ) : incident ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <div className="grid gap-5">
              <DetectionEvidence incident={incident} />
              <IncidentDetailCard incident={incident} />
            </div>

            <div className="grid content-start gap-5">
              <Card className="p-5">
                <h2 className="mb-3 font-black">ITS 정보</h2>
                <p>날씨: {incident.its?.weather ?? "-"}</p>
                <p>교통량: {incident.its?.trafficVolume ?? "-"}</p>
                <p>순찰 예상: {incident.its?.nearestPatrolEta ?? "-"}</p>
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
        ) : (
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-500">이벤트 상세 정보가 없습니다.</p>
          </Card>
        )}
      </AppLayout>
    </RequireAuth>
  );
}
