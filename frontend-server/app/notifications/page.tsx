"use client";

import { Bell, CheckCheck, FileText, MessageSquare, Radio, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { cn } from "@/lib/utils";

type NotificationType =
  | "INCIDENT_CREATED"
  | "AI_ANALYSIS_COMPLETED"
  | "STATUS_CHANGED"
  | "LLM_REPORT_CREATED"
  | "CHAT_MESSAGE";

type NotificationResourceType = "INCIDENT" | "REPORT" | "LLM_REPORT" | "CHAT_ROOM";

type NotificationFilter = "ALL" | "UNREAD" | "INCIDENT" | "AI_ANALYSIS" | "LLM_REPORT" | "CHAT";

type NotificationItem = {
  id: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  resourceType: NotificationResourceType;
  resourceId: string;
  isRead: boolean;
  createdAt: string;
};

const mockNotifications: NotificationItem[] = [
  {
    id: "noti-001",
    notificationType: "INCIDENT_CREATED",
    title: "신규 긴급 사고 발생",
    message: "경부고속도로 수원IC 인근 주행차로 정차 이벤트가 생성되었습니다.",
    resourceType: "INCIDENT",
    resourceId: "inc-001",
    isRead: false,
    createdAt: "2026-04-29 10:33:12",
  },
  {
    id: "noti-002",
    notificationType: "AI_ANALYSIS_COMPLETED",
    title: "AI 분석 완료",
    message: "서해안고속도로 안산IC 갓길 정차 신고 영상 분석이 완료되었습니다.",
    resourceType: "REPORT",
    resourceId: "rep-002",
    isRead: false,
    createdAt: "2026-04-29 10:28:40",
  },
  {
    id: "noti-003",
    notificationType: "STATUS_CHANGED",
    title: "사고 상태 변경",
    message: "STP-20260429-002 사고가 담당 배정 상태로 변경되었습니다.",
    resourceType: "INCIDENT",
    resourceId: "inc-002",
    isRead: true,
    createdAt: "2026-04-29 10:22:09",
  },
  {
    id: "noti-004",
    notificationType: "LLM_REPORT_CREATED",
    title: "LLM 보고서 생성 완료",
    message: "수원IC 긴급 사고에 대한 LLM 요약 보고서가 생성되었습니다.",
    resourceType: "LLM_REPORT",
    resourceId: "llm-001",
    isRead: false,
    createdAt: "2026-04-29 10:15:33",
  },
  {
    id: "noti-005",
    notificationType: "CHAT_MESSAGE",
    title: "사고 대응 채팅 새 메시지",
    message: "1팀 순찰 담당자가 현장 접근 예정 시간을 공유했습니다.",
    resourceType: "CHAT_ROOM",
    resourceId: "chat-001",
    isRead: true,
    createdAt: "2026-04-29 10:08:11",
  },
];

const filterOptions: Array<{ label: string; value: NotificationFilter }> = [
  { label: "전체", value: "ALL" },
  { label: "읽지 않음", value: "UNREAD" },
  { label: "사고", value: "INCIDENT" },
  { label: "AI 분석", value: "AI_ANALYSIS" },
  { label: "LLM 보고서", value: "LLM_REPORT" },
  { label: "채팅", value: "CHAT" },
];

const notificationTypeLabels: Record<NotificationType, string> = {
  INCIDENT_CREATED: "신규 사고",
  AI_ANALYSIS_COMPLETED: "AI 분석",
  STATUS_CHANGED: "상태 변경",
  LLM_REPORT_CREATED: "LLM 보고서",
  CHAT_MESSAGE: "채팅",
};

const resourceTypeLabels: Record<NotificationResourceType, string> = {
  INCIDENT: "INCIDENT",
  REPORT: "REPORT",
  LLM_REPORT: "LLM_REPORT",
  CHAT_ROOM: "CHAT_ROOM",
};

const notificationMeta: Record<NotificationType, { tone: "slate" | "blue" | "green" | "amber" | "red"; icon: typeof Bell }> = {
  INCIDENT_CREATED: { tone: "red", icon: TriangleAlert },
  AI_ANALYSIS_COMPLETED: { tone: "blue", icon: Sparkles },
  STATUS_CHANGED: { tone: "amber", icon: Radio },
  LLM_REPORT_CREATED: { tone: "green", icon: FileText },
  CHAT_MESSAGE: { tone: "slate", icon: MessageSquare },
};

function matchesFilter(notification: NotificationItem, filter: NotificationFilter) {
  if (filter === "ALL") return true;
  if (filter === "UNREAD") return !notification.isRead;
  if (filter === "INCIDENT") return notification.resourceType === "INCIDENT";
  if (filter === "AI_ANALYSIS") return notification.notificationType === "AI_ANALYSIS_COMPLETED";
  if (filter === "LLM_REPORT") return notification.resourceType === "LLM_REPORT";
  if (filter === "CHAT") return notification.resourceType === "CHAT_ROOM";
  return true;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [notifications, setNotifications] = useState(mockNotifications);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => matchesFilter(notification, filter));
  }, [filter, notifications]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  function markAllAsRead() {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true }))
    );
  }

  return (
    <RequireAuth>
      <AppLayout title="실시간 알림">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">실시간 알림</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              신규 사고, AI 분석 완료, 상태 변경, LLM 보고서 생성 알림을 확인합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            전체 읽음 처리
          </button>
        </section>

        <Card className="mb-5 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`h-10 rounded-lg border px-4 text-sm font-black transition ${
                    filter === item.value
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold text-slate-500">
              읽지 않은 알림 <strong className="text-staccato">{unreadCount}</strong>건
            </p>
          </div>
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
            TODO: Socket.IO 실시간 알림 연결은 백엔드 이벤트 계약 확정 후 추가합니다.
          </p>
        </Card>

        <section className="grid gap-3">
          {filteredNotifications.map((notification) => {
            const meta = notificationMeta[notification.notificationType];
            const Icon = meta.icon;

            return (
              <article
                key={notification.id}
                className={cn(
                  "rounded-xl border bg-white p-4 transition",
                  notification.isRead
                    ? "border-slate-200"
                    : "border-sky-200 bg-sky-50/40 shadow-sm"
                )}
              >
                <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-start">
                  <div className={`grid h-11 w-11 place-items-center rounded-lg ${notification.isRead ? "bg-slate-100 text-slate-500" : "bg-white text-sky-600"}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{notificationTypeLabels[notification.notificationType]}</Badge>
                      <Badge tone="slate">{resourceTypeLabels[notification.resourceType]}</Badge>
                      {!notification.isRead ? <span className="rounded-full bg-staccato px-2 py-1 text-xs font-black text-white">읽지 않음</span> : null}
                    </div>
                    <h3 className="mt-3 text-base font-black text-slate-950">{notification.title}</h3>
                    <p className="mt-2 text-sm font-semibold text-slate-600">{notification.message}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      관련 리소스: {notification.resourceType} / {notification.resourceId}
                    </p>
                  </div>
                  <time className="text-sm font-semibold text-slate-400">{notification.createdAt}</time>
                </div>
              </article>
            );
          })}

          {filteredNotifications.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              조건에 맞는 알림이 없습니다.
            </p>
          ) : null}
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
