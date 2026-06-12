/**
 * 파일 역할: 돌발 상황 영역에서 사용하는 IncidentStatusChanger UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useState } from "react";
// 코드 설명: @/features/incidents/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { updateIncidentStatus } from "@/features/incidents/api";
// 코드 설명: @/features/incidents/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { incidentStatusLabels, type IncidentStatus } from "@/features/incidents/types";

// 코드 설명: statuses 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statuses: IncidentStatus[] = ["DETECTED", "REVIEWING", "ASSIGNED", "RESOLVED", "FALSE_POSITIVE", "CLOSED"];

// 코드 설명: IncidentStatusChangerProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type IncidentStatusChangerProps = {
  incidentId: string;
  initialStatus: IncidentStatus;
};

// 코드 설명: IncidentStatusChanger 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function IncidentStatusChanger({ incidentId, initialStatus }: IncidentStatusChangerProps) {
  // 코드 설명: [status, setStatus] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [status, setStatus] = useState(initialStatus);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: [pendingStatus, setPendingStatus] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [pendingStatus, setPendingStatus] = useState<IncidentStatus | null>(null);

  // 코드 설명: handleStatusChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleStatusChange(nextStatus: IncidentStatus) {
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");
    // 코드 설명: setPendingStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setPendingStatus(nextStatus);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await updateIncidentStatus(incidentId, nextStatus);
      await updateIncidentStatus(incidentId, nextStatus);
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus(nextStatus);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
    } finally {
      // 코드 설명: setPendingStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setPendingStatus(null);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="grid gap-2">
      {statuses.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => handleStatusChange(item)}
          disabled={pendingStatus !== null}
          className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold disabled:opacity-60 ${
            status === item ? "border-staccato bg-red-50 text-staccato" : "border-slate-200"
          }`}
        >
          {pendingStatus === item ? "변경 중..." : incidentStatusLabels[item]}
        </button>
      ))}
      {errorMessage ? <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
