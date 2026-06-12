/**
 * 파일 역할: 보고서 영역에서 사용하는 ReportAnalysisStatus UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import { Badge } from "@/components/common/Badge";

// 코드 설명: ReportAnalysisStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ReportAnalysisStatus({ status }: { status: string }) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return <Badge tone={["COMPLETED"].includes(status) ? "green" : ["FAILED"].includes(status) ? "red" : status === "CANCELLED" ? "slate" : ["QUEUED", "RUNNING", "PROCESSING", "ANALYZING"].includes(status) ? "amber" : "blue"}>{status}</Badge>;
}

