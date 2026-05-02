"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  Cctv,
  ClipboardList,
  Database,
  FileText,
  LayoutDashboard,
  Map,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

type SidebarItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

// TODO: Add pages for placeholder hrefs when the MVP routes are implemented.
const sections: SidebarSection[] = [
  {
    title: "관제",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
      { href: "/cctvs", icon: Cctv, label: "CCTV 관제" },
      { href: "/reports", icon: ClipboardList, label: "이상상황 등록/처리" },
      { href: "/incidents", icon: ShieldCheck, label: "사고 대응 관리" },
      { href: "/map", icon: Map, label: "지도 관제" },
      { href: "/notifications", icon: Bell, label: "실시간 알림" },
      { href: "/chat", icon: MessageSquare, label: "사고 대응 채팅" },
      { href: "/chatbot", icon: Bot, label: "사고 대응 챗봇" },
      { href: "/llm-reports", icon: FileText, label: "LLM 보고서" },
      { href: "/statistics", icon: BarChart3, label: "통계 분석" },
    ],
  },
  {
    title: "관리",
    items: [
      { href: "/admin/signup-requests", icon: Users, label: "사용자 승인 관리" },
      { href: "/admin/security-logs", icon: ShieldCheck, label: "보안 로그" },
      { href: "/llm-training-data", icon: Database, label: "LLM 학습데이터" },
      { href: "/settings", icon: SlidersHorizontal, label: "시스템 설정" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    if (href === "/") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-slate-900 text-slate-200 xl:block">
      <Link href="/" className="flex h-16 items-center border-b border-white/10 px-5 no-underline">
        <img
          src="/images/logo.png"
          alt="STACCATO"
          className="h-9 w-auto object-contain"
        />
      </Link>
      <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-5 last:mb-0">
            <p className="mb-2 px-2 text-xs font-black tracking-[0.18em] text-slate-500">
              {section.title}
            </p>
            <div className="grid gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 no-underline transition hover:bg-white/5 hover:text-white",
                      active && "bg-white/10 text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
