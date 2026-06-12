/**
 * 파일 역할: 돌발 상황 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useParams } from "next/navigation";
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
