"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { getRealtimeEventPreviews } from "@/features/realtime/api";
import type { RealtimeEventPreview } from "@/features/realtime/types";
import { Header } from "./Header";
import { RealtimePreviewToast } from "@/components/notifications/RealtimePreviewToast";
import { Sidebar } from "./Sidebar";

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<RealtimeEventPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");

  async function openRealtimePreview() {
    setIsPreviewLoading(true);
    setPreviewMessage("");

    try {
      const events = await getRealtimeEventPreviews(5);
      const latestEvent = events[0];

      if (!latestEvent) {
        setPreviewEvent(null);
        setIsPreviewOpen(false);
        setPreviewMessage("미리보기 가능한 실시간 이벤트가 없습니다.");
        return;
      }

      setPreviewEvent(latestEvent);
      setIsPreviewOpen(true);
    } catch (error) {
      setPreviewEvent(null);
      setIsPreviewOpen(false);
      setPreviewMessage(error instanceof Error ? error.message : "실시간 이벤트 미리보기를 불러오지 못했습니다.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

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
