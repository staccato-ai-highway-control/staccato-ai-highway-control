/**
 * 파일 역할: 공통 UI 영역에서 사용하는 Button UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
// 코드 설명: @/lib/utils 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { cn } from "@/lib/utils";

const variants = {
  primary: "border border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-950/10 hover:border-blue-700 hover:bg-blue-700",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
  outline: "border border-blue-200 bg-white text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-50",
  danger: "border border-red-200 bg-white text-red-700 shadow-sm hover:border-red-300 hover:bg-red-50",
  ghost: "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
};

// 코드 설명: Button 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function Button({ children, className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: keyof typeof variants }) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <button
      className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

