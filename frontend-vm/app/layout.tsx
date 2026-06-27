/**
 * 파일 역할: 모든 라우트가 공유하는 루트 레이아웃과 문서 메타데이터를 정의합니다.
 * 유지보수 참고: 전역 스타일과 최상위 HTML 구조를 제공하므로 하위 페이지의 공통 렌더링 기준이 됩니다.
 */
import type { Metadata } from "next";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ReactNode } from "react";
// 코드 설명: ./globals.css 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import "./globals.css";

// 코드 설명: metadata 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const metadata: Metadata = {
  title: "STACCATO - AI-X 기반 고속도로 정차 차량 탐지",
  description: "AI-X 기반 고속도로 정차 차량 탐지 및 통합 관제 시스템",
};

// 코드 설명: RootLayout 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}