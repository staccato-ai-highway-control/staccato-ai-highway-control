/**
 * 파일 역할: 공통 UI 영역에서 사용하는 Badge UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { ReactNode } from "react";
// 코드 설명: @/lib/utils 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { cn } from "@/lib/utils";

// 코드 설명: tones 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const tones = {
  slate: "border border-slate-200 bg-slate-100 text-slate-700",
  sky: "border border-sky-200 bg-sky-50 text-sky-700",
  blue: "bg-sky-50 text-sky-700 border border-sky-200",
  green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border border-amber-200",
  red: "bg-red-50 text-red-700 border border-red-200",
};

// 코드 설명: Badge 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function Badge({ children, tone = "slate", className }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return <span className={cn("inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-bold", tones[tone], className)}>{children}</span>;
}

