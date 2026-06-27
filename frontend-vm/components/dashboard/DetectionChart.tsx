/**
 * 파일 역할: 대시보드 영역에서 사용하는 DetectionChart UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";

// 코드 설명: DetectionChart 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function DetectionChart() {
  // 코드 설명: bars 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const bars = [38, 72, 54, 86, 64, 48];
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <DashboardPanel title="정차 탐지 추이">
      <div className="flex h-full min-h-52 items-end gap-4">
        {bars.map((value, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <span className="w-full rounded-t bg-staccato" style={{ height: `${value}%` }} />
            <small className="text-xs text-slate-500">{8 + index * 2}:00</small>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}
