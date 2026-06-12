/**
 * 파일 역할: 돌발 상황 영역에서 사용하는 IncidentListTable UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import Link from "next/link";
// 코드 설명: ./IncidentStatusBadge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { IncidentStatusBadge } from "./IncidentStatusBadge";
// 코드 설명: ./RiskLevelBadge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RiskLevelBadge } from "./RiskLevelBadge";
// 코드 설명: @/features/incidents/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { incidentTypeLabels, type Incident } from "@/features/incidents/types";
// 코드 설명: @/lib/format 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { formatConfidence, formatSeconds } from "@/lib/format";

// 코드 설명: IncidentListTable 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function IncidentListTable({ incidents }: { incidents: Incident[] }) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1080px] border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            {["사건 코드", "이벤트 유형", "위치", "위험도", "AI 신뢰도", "정차 시간", "상태", "탐지 시각", "상세"].map((head) => (
              <th key={head} className="p-4">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id} className="border-t border-slate-100">
              <td className="p-4 font-bold">{incident.code}</td>
              <td>{incidentTypeLabels[incident.eventType]}</td>
              <td>{incident.location}</td>
              <td>
                <RiskLevelBadge level={incident.riskLevel} />
              </td>
              <td>{formatConfidence(incident.confidence)}</td>
              <td>{formatSeconds(incident.stoppedDurationSec)}</td>
              <td>
                <IncidentStatusBadge status={incident.status} />
              </td>
              <td>{incident.detectedAt}</td>
              <td>
                <Link href={`/incidents/${incident.id}`} className="font-bold text-staccato">
                  상세보기
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
