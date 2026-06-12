/**
 * 파일 역할: 공통 UI 영역에서 사용하는 Card UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { ReactNode } from "react";
// 코드 설명: @/lib/utils 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { cn } from "@/lib/utils";

// 코드 설명: Card 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return <section className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

