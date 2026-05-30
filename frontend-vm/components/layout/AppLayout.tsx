"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { RealtimeEventPreview } from "@/features/realtime/types";
import { Header } from "./Header";
import { RealtimePreviewToast } from "@/components/notifications/RealtimePreviewToast";
import { Sidebar } from "./Sidebar";

function createDemoPreviewEvent(): RealtimeEventPreview {
  const now = new Date().toISOString();

  return {
    realtime_event_id: "demo-event-001",
    event_type: "LANE_STOP",
    message: "CCTV-001 구간에서 도로 위 정차 의심 차량이 감지되었습니다.",
    severity: "HIGH",
    source_cctv_id: "CCTV-001",
    preview_url: null,
    preview_type: "image",
    video_url: null,
    snapshot_url: null,
    target_url: "/events",
    occurred_at: now,
    created_at: now,
    has_video: false,
    has_snapshot: false,
  };
}

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<RealtimeEventPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  function openDemoPreview() {
    setPreviewEvent(createDemoPreviewEvent());
    setIsPreviewOpen(true);
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
          onRealtimePreviewClick={openDemoPreview}
        />
        <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-5">{children}</div>
      </main>
      <RealtimePreviewToast event={previewEvent} open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />
    </div>
  );
}
