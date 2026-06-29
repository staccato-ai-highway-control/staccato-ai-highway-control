/**
 * 파일 역할: 돌발 상황 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useParams } from "next/navigation";
import { DetailPageHeader } from "@/components/layout/DetailPageHeader";
import { DetailCard } from "@/components/ui/DetailCard";
import { InfoGrid, InfoItem } from "@/components/ui/InfoGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import { incidentTypeLabels } from "@/features/incidents/types";
import { formatConfidence } from "@/lib/format";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/components/incident/DetectionEvidence 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { DetectionEvidence } from "@/components/incident/DetectionEvidence";
// 코드 설명: @/components/incident/IncidentDetailCard 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { IncidentDetailCard } from "@/components/incident/IncidentDetailCard";
// 코드 설명: @/components/incident/IncidentMemoBox 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { IncidentMemoBox } from "@/components/incident/IncidentMemoBox";
// 코드 설명: @/components/incident/IncidentStatusChanger 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { IncidentStatusChanger } from "@/components/incident/IncidentStatusChanger";
// 코드 설명: @/features/incidents/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getIncident } from "@/features/incidents/api";
// 코드 설명: @/features/incidents/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Incident } from "@/features/incidents/types";

// 코드 설명: IncidentDetailPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function IncidentDetailPage() {
  // 코드 설명: params 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const params = useParams<{ id: string }>();
  // 코드 설명: id 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const id = params?.id;

  // 코드 설명: [incident, setIncident] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [incident, setIncident] = useState<Incident | null>(null);
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 코드 설명: [isLoading, setIsLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isLoading, setIsLoading] = useState(true);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: cancelled 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let cancelled = false;

    // 코드 설명: loadIncident 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function loadIncident() {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !id
      if (!id) {
        // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setErrorMessage("이벤트 ID가 없습니다.");
        // 코드 설명: setIsLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setIsLoading(false);
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: setIsLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsLoading(true);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(null);

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const data = await getIncident(id);
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !cancelled
        if (!cancelled) setIncident(data);
      } catch (error) {
        // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const message = error instanceof Error ? error.message : "이벤트 상세 정보를 불러오지 못했습니다.";
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !cancelled
        if (!cancelled) setErrorMessage(message);
      } finally {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !cancelled
        if (!cancelled) setIsLoading(false);
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadIncident();
    loadIncident();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { cancelled = true; }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: cancelled = true;
      cancelled = true;
    };
  }, [id]);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <AppLayout title="이벤트 상세">
        {isLoading ? (
          <Card className="p-8 text-center text-sm font-semibold text-slate-500">이벤트 상세 정보를 불러오는 중입니다.</Card>
        ) : errorMessage ? (
          <Card className="p-8 text-center"><h2 className="font-black text-red-600">이벤트 상세 조회 실패</h2><p className="mt-2 text-sm font-semibold text-slate-500">{errorMessage}</p></Card>
        ) : incident ? (
          <>
            <DetailPageHeader
              title="이벤트 상세"
              code={incident.code || incident.id}
              backHref="/incidents"
              badges={<><IncidentStatusBadge status={incident.status} /><RiskLevelBadge level={incident.riskLevel} /><StatusBadge value="REALTIME">실시간 이벤트</StatusBadge></>}
            />
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <main className="grid min-w-0 content-start gap-6">
                <DetectionEvidence incident={incident} />
                <IncidentDetailCard incident={incident} />
                <DetailCard title="AI 탐지 상세" description="모델이 이벤트로 판단할 때 사용한 핵심 수치입니다.">
                  <InfoGrid>
                    <InfoItem label="CCTV" value={incident.cctvId} />
                    <InfoItem label="이벤트 유형" value={incidentTypeLabels[incident.eventType]} />
                    <InfoItem label="AI 신뢰도" value={formatConfidence(incident.confidence)} />
                    <InfoItem label="ROI 유형" value={incident.roiType} />
                    <InfoItem label="움직임 변화량" value={incident.movementDeltaPx + "px"} />
                    <InfoItem label="정차 지속 시간" value={incident.stoppedDurationSec + "초"} />
                  </InfoGrid>
                </DetailCard>
                <DetailCard title="탐지 로그 및 판단 근거">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-600">
                    <p>탐지 시각: <strong className="text-slate-900">{incident.detectedAt || "-"}</strong></p>
                    <p>판단 근거: ROI 내 차량 움직임 변화량 {incident.movementDeltaPx}px, 정차 지속 {incident.stoppedDurationSec}초, 신뢰도 {formatConfidence(incident.confidence)}</p>
                  </div>
                </DetailCard>
              </main>
              <aside className="grid content-start gap-5 xl:sticky xl:top-24 xl:self-start">
                <DetailCard title="상태 변경"><IncidentStatusChanger incidentId={incident.id} initialStatus={incident.status} /></DetailCard>
                <DetailCard title="AI 판단 근거">
                  <InfoGrid className="sm:grid-cols-1">
                    <InfoItem label="ROI 유형" value={incident.roiType} />
                    <InfoItem label="이동량" value={incident.movementDeltaPx != null ? `${incident.movementDeltaPx}px` : undefined} />
                    <InfoItem label="정차 지속 시간" value={incident.stoppedDurationSec != null ? `${incident.stoppedDurationSec}초` : undefined} />
                    <InfoItem label="AI 신뢰도" value={formatConfidence(incident.confidence)} />
                  </InfoGrid>
                </DetailCard>
                <DetailCard title="관리자 메모"><IncidentMemoBox memo={incident.memo} /></DetailCard>
                <DetailCard title="AI 탐지 결과 요약">
                  <InfoGrid className="sm:grid-cols-1">
                    <InfoItem label="위험도" value={<RiskLevelBadge level={incident.riskLevel} />} />
                    <InfoItem label="위험 점수" value={incident.riskScore} />
                    <InfoItem label="AI 신뢰도" value={formatConfidence(incident.confidence)} />
                    <InfoItem label="분석 Job" value={incident.analysis_job_id ?? incident.job_id} />
                  </InfoGrid>
                </DetailCard>
              </aside>
            </section>
          </>
        ) : (
          <Card className="p-8 text-center text-sm font-semibold text-slate-500">이벤트 상세 정보가 없습니다.</Card>
        )}
      </AppLayout>
    </RequireAuth>
  );
}
