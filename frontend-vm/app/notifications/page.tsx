"use client";

import { Bell, Check, CheckCheck, FileText, MapPin, MessageSquare, Radio, ShieldAlert, Sparkles, Trash2, TriangleAlert, UserCheck, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { cn } from "@/lib/utils";

type NotificationType =
  | "INCIDENT_CREATED"
  | "AI_ANALYSIS_COMPLETED"
  | "AI_ANALYSIS_FAILED"
  | "STATUS_CHANGED"
  | "LLM_REPORT_CREATED"
  | "LLM_REPORT_FAILED"
  | "CHAT_MESSAGE"
  | "SIGNUP_APPROVAL_REQUESTED"
  | "USER_STATUS_CHANGED"
  | "SYSTEM_STATUS"
  | "SECURITY_EVENT"
  | "DISPATCH_ASSIGNED"
  | "DISPATCH_STATUS_CHANGED"
  | "CONTROL_MESSAGE"
  | "LOCATION_CHANGED"
  | "ACTION_REQUESTED";

type NotificationResourceType = "INCIDENT" | "REPORT" | "LLM_REPORT" | "CHAT_ROOM" | "USER" | "SYSTEM" | "SECURITY";

type NotificationFilter = "ALL" | "UNREAD" | "INCIDENT" | "AI_ANALYSIS" | "LLM_REPORT" | "CHAT" | "ADMIN" | "SYSTEM" | "SECURITY" | "DISPATCH" | "CONTROL_MESSAGE" | "LOCATION";
type NotificationPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type NotificationItem = {
  id: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  resourceType: NotificationResourceType;
  resourceId: string;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: string;
};

type NotificationRole = Extract<UserRole, "SUPER_ADMIN" | "CONTROL_ADMIN" | "MAINTAINER">;

const mockNotificationsByRole: Record<NotificationRole, NotificationItem[]> = {
  SUPER_ADMIN: [
    {
      id: "noti-001",
      notificationType: "SIGNUP_APPROVAL_REQUESTED",
      title: "가입 승인 요청",
      message: "신규 출동 관리자 계정 승인 요청이 접수되었습니다.",
      resourceType: "USER",
      resourceId: "signup-005",
      isRead: false,
      priority: "HIGH",
      createdAt: "2026-04-29 10:33:12",
    },
    {
      id: "noti-002",
      notificationType: "USER_STATUS_CHANGED",
      title: "사용자 상태 변경",
      message: "관제 담당자 계정 상태가 활성으로 변경되었습니다.",
      resourceType: "USER",
      resourceId: "user-023",
      isRead: true,
      priority: "MEDIUM",
      createdAt: "2026-04-29 10:24:09",
    },
    {
      id: "noti-003",
      notificationType: "SECURITY_EVENT",
      title: "보안 로그 알림",
      message: "관리자 계정의 새 로그인 이벤트가 기록되었습니다.",
      resourceType: "SECURITY",
      resourceId: "sec-20260429-001",
      isRead: false,
      priority: "URGENT",
      createdAt: "2026-04-29 10:11:48",
    },
    {
      id: "noti-004",
      notificationType: "SYSTEM_STATUS",
      title: "시스템 상태 알림",
      message: "Flask API, DB, AI 연계 상태가 정상 범위로 확인되었습니다.",
      resourceType: "SYSTEM",
      resourceId: "system-health",
      isRead: true,
      priority: "LOW",
      createdAt: "2026-04-29 09:58:44",
    },
    {
      id: "noti-005",
      notificationType: "INCIDENT_CREATED",
      title: "전체 사고 알림",
      message: "경부고속도로 수원IC 인근 주행차로 정차 이벤트가 생성되었습니다.",
      resourceType: "INCIDENT",
      resourceId: "inc-001",
      isRead: false,
      priority: "HIGH",
      createdAt: "2026-04-29 09:42:11",
    },
  ],
  CONTROL_ADMIN: [
    {
      id: "noti-001",
      notificationType: "INCIDENT_CREATED",
      title: "신규 사고 알림",
      message: "경부고속도로 수원IC 인근 주행차로 정차 이벤트가 생성되었습니다.",
      resourceType: "INCIDENT",
      resourceId: "inc-001",
      isRead: false,
      priority: "URGENT",
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
      priority: "HIGH",
      createdAt: "2026-04-29 10:28:40",
    },
    {
      id: "noti-003",
      notificationType: "AI_ANALYSIS_FAILED",
      title: "AI 분석 실패",
      message: "매송IC 신고 영상 분석이 실패했습니다. 재분석 요청이 필요합니다.",
      resourceType: "REPORT",
      resourceId: "rep-003",
      isRead: false,
      priority: "HIGH",
      createdAt: "2026-04-29 10:25:10",
    },
    {
      id: "noti-004",
      notificationType: "STATUS_CHANGED",
      title: "사고 상태 변경",
      message: "STP-20260429-002 사고가 담당 배정 상태로 변경되었습니다.",
      resourceType: "INCIDENT",
      resourceId: "inc-002",
      isRead: true,
      priority: "MEDIUM",
      createdAt: "2026-04-29 10:22:09",
    },
    {
      id: "noti-005",
      notificationType: "LLM_REPORT_CREATED",
      title: "LLM 보고서 생성 완료",
      message: "수원IC 긴급 사고에 대한 LLM 요약 보고서가 생성되었습니다.",
      resourceType: "LLM_REPORT",
      resourceId: "llm-001",
      isRead: false,
      priority: "MEDIUM",
      createdAt: "2026-04-29 10:15:33",
    },
    {
      id: "noti-006",
      notificationType: "LLM_REPORT_FAILED",
      title: "LLM 보고서 생성 실패",
      message: "STP-20260429-003 보고서 생성이 실패했습니다.",
      resourceType: "LLM_REPORT",
      resourceId: "llm-003",
      isRead: false,
      priority: "HIGH",
      createdAt: "2026-04-29 10:11:45",
    },
    {
      id: "noti-007",
      notificationType: "CHAT_MESSAGE",
      title: "채팅 메시지 알림",
      message: "1팀 순찰 담당자가 현장 접근 예정 시간을 공유했습니다.",
      resourceType: "CHAT_ROOM",
      resourceId: "chat-001",
      isRead: true,
      priority: "MEDIUM",
      createdAt: "2026-04-29 10:08:11",
    },
  ],
  MAINTAINER: [
    {
      id: "noti-001",
      notificationType: "DISPATCH_ASSIGNED",
      title: "내 배정 사고 알림",
      message: "영동고속도로 용인IC 갓길 정차 건이 출동 담당으로 배정되었습니다.",
      resourceType: "INCIDENT",
      resourceId: "inc-002",
      isRead: false,
      priority: "HIGH",
      createdAt: "2026-04-29 09:24:12",
    },
    {
      id: "noti-002",
      notificationType: "DISPATCH_STATUS_CHANGED",
      title: "출동 상태 변경",
      message: "배정 사고가 출동/처리 중 상태로 변경되었습니다.",
      resourceType: "INCIDENT",
      resourceId: "inc-002",
      isRead: true,
      priority: "MEDIUM",
      createdAt: "2026-04-29 09:20:03",
    },
    {
      id: "noti-003",
      notificationType: "CONTROL_MESSAGE",
      title: "관제자 메시지 알림",
      message: "관제센터에서 현장 접근 전 후방 안전 확보를 요청했습니다.",
      resourceType: "CHAT_ROOM",
      resourceId: "chat-002",
      isRead: false,
      priority: "HIGH",
      createdAt: "2026-04-29 09:18:24",
    },
    {
      id: "noti-004",
      notificationType: "LOCATION_CHANGED",
      title: "사고 위치 변경",
      message: "배정 사고 위치가 용인IC 45.1K 갓길로 보정되었습니다.",
      resourceType: "INCIDENT",
      resourceId: "inc-002",
      isRead: false,
      priority: "MEDIUM",
      createdAt: "2026-04-29 09:12:51",
    },
    {
      id: "noti-005",
      notificationType: "ACTION_REQUESTED",
      title: "처리 요청 알림",
      message: "현장 조치 완료 후 처리 결과 작성을 요청합니다.",
      resourceType: "INCIDENT",
      resourceId: "inc-002",
      isRead: false,
      priority: "HIGH",
      createdAt: "2026-04-29 09:10:02",
    },
  ],
};

const commonFilterOptions: Array<{ label: string; value: NotificationFilter }> = [
  { label: "전체", value: "ALL" },
  { label: "읽지 않음", value: "UNREAD" },
];

const superAdminFilterOptions: Array<{ label: string; value: NotificationFilter }> = [
  ...commonFilterOptions,
  { label: "관리", value: "ADMIN" },
  { label: "시스템", value: "SYSTEM" },
  { label: "보안", value: "SECURITY" },
  { label: "사고", value: "INCIDENT" },
];

const controlAdminFilterOptions: Array<{ label: string; value: NotificationFilter }> = [
  ...commonFilterOptions,
  { label: "사고", value: "INCIDENT" },
  { label: "AI 분석", value: "AI_ANALYSIS" },
  { label: "LLM 보고서", value: "LLM_REPORT" },
  { label: "채팅", value: "CHAT" },
];

const maintainerFilterOptions: Array<{ label: string; value: NotificationFilter }> = [
  ...commonFilterOptions,
  { label: "출동", value: "DISPATCH" },
  { label: "관제 메시지", value: "CONTROL_MESSAGE" },
  { label: "위치/요청", value: "LOCATION" },
];

const notificationTypeLabels: Record<NotificationType, string> = {
  INCIDENT_CREATED: "신규 사고",
  AI_ANALYSIS_COMPLETED: "AI 분석",
  AI_ANALYSIS_FAILED: "AI 분석 실패",
  STATUS_CHANGED: "상태 변경",
  LLM_REPORT_CREATED: "LLM 보고서",
  LLM_REPORT_FAILED: "보고서 실패",
  CHAT_MESSAGE: "채팅",
  SIGNUP_APPROVAL_REQUESTED: "가입 승인",
  USER_STATUS_CHANGED: "사용자 상태",
  SYSTEM_STATUS: "시스템",
  SECURITY_EVENT: "보안",
  DISPATCH_ASSIGNED: "배정 사고",
  DISPATCH_STATUS_CHANGED: "출동 상태",
  CONTROL_MESSAGE: "관제 메시지",
  LOCATION_CHANGED: "위치 변경",
  ACTION_REQUESTED: "처리 요청",
};

const resourceTypeLabels: Record<NotificationResourceType, string> = {
  INCIDENT: "INCIDENT",
  REPORT: "REPORT",
  LLM_REPORT: "LLM_REPORT",
  CHAT_ROOM: "CHAT_ROOM",
  USER: "USER",
  SYSTEM: "SYSTEM",
  SECURITY: "SECURITY",
};

const notificationMeta: Record<NotificationType, { tone: "slate" | "blue" | "green" | "amber" | "red"; icon: typeof Bell }> = {
  INCIDENT_CREATED: { tone: "red", icon: TriangleAlert },
  AI_ANALYSIS_COMPLETED: { tone: "blue", icon: Sparkles },
  AI_ANALYSIS_FAILED: { tone: "red", icon: Sparkles },
  STATUS_CHANGED: { tone: "amber", icon: Radio },
  LLM_REPORT_CREATED: { tone: "green", icon: FileText },
  LLM_REPORT_FAILED: { tone: "red", icon: FileText },
  CHAT_MESSAGE: { tone: "slate", icon: MessageSquare },
  SIGNUP_APPROVAL_REQUESTED: { tone: "amber", icon: UserCheck },
  USER_STATUS_CHANGED: { tone: "blue", icon: UserCog },
  SYSTEM_STATUS: { tone: "green", icon: Radio },
  SECURITY_EVENT: { tone: "red", icon: ShieldAlert },
  DISPATCH_ASSIGNED: { tone: "amber", icon: TriangleAlert },
  DISPATCH_STATUS_CHANGED: { tone: "blue", icon: Radio },
  CONTROL_MESSAGE: { tone: "amber", icon: MessageSquare },
  LOCATION_CHANGED: { tone: "blue", icon: MapPin },
  ACTION_REQUESTED: { tone: "red", icon: Check },
};

const priorityLabels: Record<NotificationPriority, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  URGENT: "긴급",
};

const priorityTone: Record<NotificationPriority, "slate" | "blue" | "green" | "amber" | "red"> = {
  LOW: "slate",
  MEDIUM: "blue",
  HIGH: "amber",
  URGENT: "red",
};

function matchesFilter(notification: NotificationItem, filter: NotificationFilter) {
  if (filter === "ALL") return true;
  if (filter === "UNREAD") return !notification.isRead;
  if (filter === "INCIDENT") return notification.resourceType === "INCIDENT";
  if (filter === "AI_ANALYSIS") return notification.notificationType === "AI_ANALYSIS_COMPLETED" || notification.notificationType === "AI_ANALYSIS_FAILED";
  if (filter === "LLM_REPORT") return notification.resourceType === "LLM_REPORT";
  if (filter === "CHAT") return notification.resourceType === "CHAT_ROOM";
  if (filter === "ADMIN") return notification.resourceType === "USER";
  if (filter === "SYSTEM") return notification.resourceType === "SYSTEM";
  if (filter === "SECURITY") return notification.resourceType === "SECURITY";
  if (filter === "DISPATCH") return notification.notificationType === "DISPATCH_ASSIGNED" || notification.notificationType === "DISPATCH_STATUS_CHANGED";
  if (filter === "CONTROL_MESSAGE") return notification.notificationType === "CONTROL_MESSAGE";
  if (filter === "LOCATION") return notification.notificationType === "LOCATION_CHANGED" || notification.notificationType === "ACTION_REQUESTED";
  return true;
}

function isMaintainerRole(role: UserRole | null | undefined) {
  return role === "MAINTAINER" || role === "DISPATCH_ADMIN";
}

function getNotificationRole(role: UserRole | null | undefined): NotificationRole | null {
  if (role === "SUPER_ADMIN" || role === "CONTROL_ADMIN") return role;
  if (isMaintainerRole(role)) return "MAINTAINER";
  return null;
}

function getFilterOptions(role: UserRole | null | undefined) {
  if (role === "SUPER_ADMIN") return superAdminFilterOptions;
  if (role === "CONTROL_ADMIN") return controlAdminFilterOptions;
  if (isMaintainerRole(role)) return maintainerFilterOptions;
  return commonFilterOptions;
}

export default function NotificationsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [notificationsByRole, setNotificationsByRole] = useState(mockNotificationsByRole);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const roleKey = getNotificationRole(authUser?.role);
  const filterOptions = useMemo(() => getFilterOptions(authUser?.role), [authUser?.role]);
  const roleNotifications = roleKey ? notificationsByRole[roleKey] : [];

  useEffect(() => {
    if (!filterOptions.some((item) => item.value === filter)) {
      setFilter("ALL");
    }
  }, [filter, filterOptions]);

  const filteredNotifications = useMemo(() => {
    return roleNotifications.filter((notification) => matchesFilter(notification, filter));
  }, [filter, roleNotifications]);

  const unreadCount = roleNotifications.filter((notification) => !notification.isRead).length;

  function updateRoleNotifications(updater: (notifications: NotificationItem[]) => NotificationItem[]) {
    if (!roleKey) return;

    setNotificationsByRole((current) => ({
      ...current,
      [roleKey]: updater(current[roleKey]),
    }));
  }

  function markAllAsRead() {
    updateRoleNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
  }

  function markAsRead(notificationId: string) {
    updateRoleNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      )
    );
  }

  function deleteNotification(notificationId: string) {
    updateRoleNotifications((current) => current.filter((notification) => notification.id !== notificationId));
  }

  return (
    <RequireAuth>
      <AppLayout title="실시간 알림">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">실시간 알림</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              권한에 따라 필요한 알림 유형과 우선순위만 필터링해 확인합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={!roleKey || unreadCount === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
                  key={`${roleKey ?? "NO_ROLE"}-${item.value}`}
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
                key={`${roleKey ?? "NO_ROLE"}-${notification.id}`}
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
                      <Badge tone={priorityTone[notification.priority]}>{priorityLabels[notification.priority]}</Badge>
                      {!notification.isRead ? <span className="rounded-full bg-staccato px-2 py-1 text-xs font-black text-white">읽지 않음</span> : null}
                    </div>
                    <h3 className="mt-3 text-base font-black text-slate-950">{notification.title}</h3>
                    <p className="mt-2 text-sm font-semibold text-slate-600">{notification.message}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      관련 리소스: {notification.resourceType} / {notification.resourceId}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 md:items-end">
                    <time className="text-sm font-semibold text-slate-400">{notification.createdAt}</time>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        disabled={notification.isRead}
                        aria-label="읽음 처리"
                        title="읽음 처리"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNotification(notification.id)}
                        aria-label="알림 삭제"
                        title="알림 삭제"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
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
