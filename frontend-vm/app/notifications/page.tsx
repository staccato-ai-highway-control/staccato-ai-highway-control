"use client";

import { Bell, CheckCheck, Radio, ShieldAlert, Sparkles, Trash2, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";

type NotificationType = "INCIDENT" | "AI_ANALYSIS" | "REPORT" | "ADMIN" | "SYSTEM";
type NotificationFilter = "ALL" | "UNREAD" | NotificationType;

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: "noti-incident-001",
    type: "INCIDENT",
    title: "실시간 이벤트 발생",
    message: "경부고속도로 수원IC 인근 주행차로 정차 AI 탐지 결과가 수신되었습니다.",
    createdAt: "2026-05-21 10:23",
    isRead: false,
  },
  {
    id: "noti-analysis-001",
    type: "AI_ANALYSIS",
    title: "AI 분석 완료",
    message: "서해안고속도로 안산IC 신고 영상 분석이 완료되어 이벤트 전환 검토가 필요합니다.",
    createdAt: "2026-05-21 10:18",
    isRead: false,
  },
  {
    id: "noti-report-001",
    type: "REPORT",
    title: "신고 접수",
    message: "갓길 정차 신고가 접수되었습니다. 첨부파일 미리보기와 분석 상태를 확인하세요.",
    createdAt: "2026-05-21 09:54",
    isRead: true,
  },
  {
    id: "noti-admin-001",
    type: "ADMIN",
    title: "회원가입 승인 대기",
    message: "신규 관리자 계정 승인 요청이 접수되었습니다.",
    createdAt: "2026-05-21 09:12",
    isRead: true,
  },
  {
    id: "noti-system-001",
    type: "SYSTEM",
    title: "WebSocket 연결 정상",
    message: "실시간 이벤트 알림 채널이 정상 상태입니다.",
    createdAt: "2026-05-21 08:45",
    isRead: true,
  },
];

const filterOptions: Array<{ label: string; value: NotificationFilter }> = [
  { label: "전체", value: "ALL" },
  { label: "읽지 않음", value: "UNREAD" },
  { label: "실시간 이벤트", value: "INCIDENT" },
  { label: "AI 분석", value: "AI_ANALYSIS" },
  { label: "신고", value: "REPORT" },
  { label: "관리", value: "ADMIN" },
  { label: "시스템", value: "SYSTEM" },
];

const typeMeta: Record<NotificationType, { label: string; tone: "blue" | "green" | "amber" | "red" | "slate"; icon: typeof Bell }> = {
  INCIDENT: { label: "실시간 이벤트", tone: "red", icon: ShieldAlert },
  AI_ANALYSIS: { label: "AI 분석", tone: "green", icon: Sparkles },
  REPORT: { label: "신고", tone: "blue", icon: Bell },
  ADMIN: { label: "관리", tone: "amber", icon: UserCheck },
  SYSTEM: { label: "시스템", tone: "slate", icon: Radio },
};

function matchesFilter(notification: NotificationItem, filter: NotificationFilter) {
  if (filter === "ALL") return true;
  if (filter === "UNREAD") return !notification.isRead;
  return notification.type === filter;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");

  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => matchesFilter(notification, filter)),
    [filter, notifications]
  );
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <RequireAuth>
      <AppLayout title="알림">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">알림</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              WebSocket 실시간 이벤트, 신고 분석 상태, 시스템 상태 알림을 통합 확인합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))}
            disabled={unreadCount === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            모두 읽음
          </button>
        </section>

        <section className="mb-5 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
          {filterOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`h-10 shrink-0 rounded-lg border px-4 text-sm font-black transition ${
                filter === item.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </section>

        <section className="grid gap-3">
          {filteredNotifications.map((notification) => {
            const meta = typeMeta[notification.type];
            const Icon = meta.icon;

            return (
              <article key={notification.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-950">{notification.title}</h3>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {!notification.isRead ? <Badge tone="red">NEW</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-xs font-bold text-slate-400">{notification.createdAt}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifications((current) => current.filter((item) => item.id !== notification.id))}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-100 px-3 text-xs font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    삭제
                  </button>
                </div>
              </article>
            );
          })}
          {filteredNotifications.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
              조건에 맞는 알림이 없습니다.
            </p>
          ) : null}
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
