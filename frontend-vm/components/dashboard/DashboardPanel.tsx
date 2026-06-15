/**
 * 파일 역할: 대시보드 영역에서 사용하는 DashboardPanel UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { ReactNode } from "react";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/lib/utils 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { cn } from "@/lib/utils";

// 코드 설명: DashboardPanel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function DashboardPanel({
  title,
  children,
  className,
  bodyClassName,
  titleAction,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  titleAction?: ReactNode;
  compact?: boolean;
}) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <Card className={cn("flex flex-col overflow-hidden rounded-2xl p-5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)]", compact ? "min-h-0" : "min-h-72", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        {titleAction}
      </div>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </Card>
  );
}
