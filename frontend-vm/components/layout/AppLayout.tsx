/**
 * 파일 역할: 애플리케이션 레이아웃 영역에서 사용하는 AppLayout UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ReactNode } from "react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useState } from "react";
// 코드 설명: @/features/realtime/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getRealtimeEventPreviews } from "@/features/realtime/api";
// 코드 설명: @/features/realtime/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { RealtimeEventPreview } from "@/features/realtime/types";
// 코드 설명: ./Header 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Header } from "./Header";
// 코드 설명: @/components/notifications/RealtimePreviewToast 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RealtimePreviewToast } from "@/components/notifications/RealtimePreviewToast";
// 코드 설명: ./Sidebar 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Sidebar } from "./Sidebar";

// 코드 설명: AppLayout 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  // 코드 설명: [isMobileMenuOpen, setIsMobileMenuOpen] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // 코드 설명: [previewEvent, setPreviewEvent] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [previewEvent, setPreviewEvent] = useState<RealtimeEventPreview | null>(null);
  // 코드 설명: [isPreviewOpen, setIsPreviewOpen] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // 코드 설명: [isPreviewLoading, setIsPreviewLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  // 코드 설명: [previewMessage, setPreviewMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [previewMessage, setPreviewMessage] = useState("");

  // 코드 설명: openRealtimePreview 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function openRealtimePreview() {
    // 코드 설명: setIsPreviewLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsPreviewLoading(true);
    // 코드 설명: setPreviewMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setPreviewMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: events 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const events = await getRealtimeEventPreviews(5);
      // 코드 설명: latestEvent 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const latestEvent = events[0];

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !latestEvent
      if (!latestEvent) {
        // 코드 설명: setPreviewEvent 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setPreviewEvent(null);
        // 코드 설명: setIsPreviewOpen 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setIsPreviewOpen(false);
        // 코드 설명: setPreviewMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setPreviewMessage("미리보기 가능한 실시간 이벤트가 없습니다.");
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: setPreviewEvent 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setPreviewEvent(latestEvent);
      // 코드 설명: setIsPreviewOpen 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsPreviewOpen(true);
    } catch (error) {
      // 코드 설명: setPreviewEvent 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setPreviewEvent(null);
      // 코드 설명: setIsPreviewOpen 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsPreviewOpen(false);
      // 코드 설명: setPreviewMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setPreviewMessage(error instanceof Error ? error.message : "실시간 이벤트 미리보기를 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setIsPreviewLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsPreviewLoading(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <main className="min-h-screen xl:pl-60">
        <Header
          title={title}
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          onRealtimePreviewClick={openRealtimePreview}
          isRealtimePreviewLoading={isPreviewLoading}
        />
        <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-5">{children}</div>
      </main>
      {previewMessage ? (
        <div className="fixed right-4 top-20 z-[80] flex w-[min(420px,calc(100vw-2rem))] items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 shadow-xl">
          <span>{previewMessage}</span>
          <button type="button" onClick={() => setPreviewMessage("")} className="shrink-0 font-black text-amber-700" aria-label="실시간 미리보기 안내 닫기">닫기</button>
        </div>
      ) : null}
      <RealtimePreviewToast event={previewEvent} open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />
    </div>
  );
}
