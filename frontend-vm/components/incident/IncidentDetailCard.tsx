/**
 * 파일 역할: 돌발 상황 영역에서 사용하는 IncidentDetailCard UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import { DetailCard } from "@/components/ui/DetailCard";
import { InfoGrid, InfoItem } from "@/components/ui/InfoGrid";
// 코드 설명: ./RiskLevelBadge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RiskLevelBadge } from "./RiskLevelBadge";
// 코드 설명: ./IncidentStatusBadge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { IncidentStatusBadge } from "./IncidentStatusBadge";
// 코드 설명: @/features/incidents/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { incidentTypeLabels, type Incident } from "@/features/incidents/types";
// 코드 설명: @/lib/format 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { formatConfidence, formatSeconds } from "@/lib/format";

// 코드 설명: IncidentDetailCard 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function IncidentDetailCard({ incident }: { incident: Incident }) {
  // 코드 설명: rows 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const rows = [
    ["이벤트 유형", incidentTypeLabels[incident.eventType]],
    ["위험 점수", String(incident.riskScore)],
    ["위험도", <RiskLevelBadge key="risk" level={incident.riskLevel} />],
    ["AI 신뢰도", formatConfidence(incident.confidence)],
    ["정차 지속 시간", formatSeconds(incident.stoppedDurationSec)],
    ["ROI 유형", incident.roiType],
    ["움직임 변화량", `${incident.movementDeltaPx}px`],
    ["상태", <IncidentStatusBadge key="status" status={incident.status} />],
  ];

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <DetailCard title="이벤트 요약" description={incident.location}>
      <InfoGrid>
        {rows.map(([label, value]) => <InfoItem key={String(label)} label={String(label)} value={value} />)}
      </InfoGrid>
    </DetailCard>
  );
}
