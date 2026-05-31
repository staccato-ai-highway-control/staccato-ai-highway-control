"use client";

import type { LucideIcon } from "lucide-react";
import { Bell, CheckCheck, Radio, ShieldAlert, Sparkles, Trash2, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { useRealtimeIncidents } from "@/features/realtime/useRealtimeIncidents";
import type { RealtimeConnectionStatus, RealtimeIncidentEvent } from "@/features/realtime/types";

type NotificationType = "INCIDENT" | "AI_ANALYSIS" | "REPORT" | "ADMIN" | "SYSTEM";
type NotificationFilter = "ALL" | "UNREAD" | NotificationType;

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  source?: RealtimeIncidentEvent;
};

const filterOptions: Array<{ label: string; value: NotificationFilter }> = [
  { label: "전체", value: "ALL" },
  { label: "읽지 않음", value: "UNREAD" },
  { label: "실시간 이벤트", value: "INCIDENT" },
  { label: "AI 분석", value: "AI_ANALYSIS" },
  { label: "신고", value: "REPORT" },
  { label: "관리", value: "ADMIN" },
  { label: "시스템", value: "SYSTEM" },
];

const typeMeta: Record<NotificationType, { label: string; tone: "blue" | "green" | "amber" | "red" | "slate"; icon: LucideIcon }> = {
  INCIDENT: { label: "실시간 이벤트", tone: "red", icon: ShieldAlert },
  AI_ANALYSIS: { label: "AI 분석", tone: "green", icon: Sparkles },
  REPORT: { label: "신고", tone: "blue", icon: Bell },
  ADMIN: { label: "관리", tone: "amber", icon: UserCheck },
  SYSTEM: { label: "시스템", tone: "slate", icon: Radio },
};

const connectionMeta: Record<RealtimeConnectionStatus, { label: string; tone: "blue" | "green" | "amber" | "red" | "slate" }> = {
  connecting: { label: "연결 중", tone: "amber" },
  connected: { label: "실시간 연결 정상", tone: "green" },
  disconnected: { label: "연결 끊김", tone: "slate" },
  error: { label: "연결 오류", tone: "red" },
};

const READ_NOTIFICATION_IDS_KEY = "staccato:notifications:readIds";
const DELETED_NOTIFICATION_IDS_KEY = "staccato:notifications:deletedIds";

function loadStoredIdSet(key: string) {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function saveStoredIdSet(key: string, values: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(values)));
  } catch {
    // localStorage 저장 실패는 알림 표시 자체를 막지 않습니다.
  }
}

function matchesFilter(notification: NotificationItem, filter: NotificationFilter) {
  if (filter === "ALL") return true;
  if (filter === "UNREAD") return !notification.isRead;
  return notification.type === filter;
}

function getEventKey(event: RealtimeIncidentEvent) {
  return String(
    event.realtime_event_id ??
      event.id ??
      `${event.incident_id ?? "incident"}-${event.created_at ?? event.occurred_at ?? ""}`
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildIncidentTitle(event: RealtimeIncidentEvent) {
  if (event.incident_code) return `사고 이벤트 ${event.incident_code}`;
  if (event.event_type) return `실시간 이벤트 ${event.event_type}`;
  return "실시간 이벤트 발생";
}

function buildIncidentMessage(event: RealtimeIncidentEvent) {
  if (event.message) return event.message;

  const parts = [
    event.severity ? `심각도: ${event.severity}` : null,
    event.cctv_id ? `CCTV: ${event.cctv_id}` : null,
    event.vehicle_class ? `차량: ${event.vehicle_class}` : null,
    event.confidence ? `신뢰도: ${event.confidence}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "새로운 실시간 사고 이벤트가 수신되었습니다.";
}

function toNotificationItem(event: RealtimeIncidentEvent, readIds: Set<string>, deletedIds: Set<string>): NotificationItem | null {
  const id = getEventKey(event);

  if (deletedIds.has(id)) return null;

  return {
    id,
    type: "INCIDENT",
    title: buildIncidentTitle(event),
    message: buildIncidentMessage(event),
    createdAt: formatDateTime(event.created_at ?? event.occurred_at),
    isRead: readIds.has(id),
    source: event,
  };
}



export default function NotificationsPage() {
  const { events, status, errorMessage, socketBaseUrl } = useRealtimeIncidents(30);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [readIds, setReadIds] = useState<Set<string>>(() => loadStoredIdSet(READ_NOTIFICATION_IDS_KEY));
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => loadStoredIdSet(DELETED_NOTIFICATION_IDS_KEY));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const notifications = useMemo(
    () =>
      events
        .map((event) => toNotificationItem(event, readIds, deletedIds))
        .filter((item): item is NotificationItem => Boolean(item)),
    [events, readIds, deletedIds]
  );

  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => matchesFilter(notification, filter)),
    [filter, notifications]
  );

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const connection = connectionMeta[status];

  function markAsRead(notificationId: string) {
    setReadIds((current) => {
      const next = new Set([...current, notificationId]);
      saveStoredIdSet(READ_NOTIFICATION_IDS_KEY, next);
      return next;
    });
  }

  function openNotification(notification: NotificationItem) {
    markAsRead(notification.id);
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(notification.id)) {
        next.delete(notification.id);
      } else {
        next.add(notification.id);
      }

      return next;
    });
  }

  return (
    <RequireAuth>
      <AppLayout title="알림">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">알림</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              실시간 사고 이벤트와 최근 알림을 통합 확인합니다.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={connection.tone}>{connection.label}</Badge>
              <span className="text-xs font-bold text-slate-400">Socket: {socketBaseUrl}</span>
              {errorMessage ? <span className="text-xs font-bold text-red-500">{errorMessage}</span> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = new Set(notifications.map((item) => item.id));
              saveStoredIdSet(READ_NOTIFICATION_IDS_KEY, next);
              setReadIds(next);
            }}
            disabled={unreadCount === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            모두 읽음
          </button>
        </section>

        <section className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-400">전체 알림</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{notifications.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-400">읽지 않음</p>
            <p className="mt-2 text-2xl font-black text-red-600">{unreadCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-400">연결 상태</p>
            <p className="mt-2 text-sm font-black text-slate-700">{connection.label}</p>
          </div>
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
              <article
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={() => openNotification(notification)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openNotification(notification);
                  }
                }}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
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
                      <p className="mt-2 text-xs font-bold text-blue-500">클릭하면 상세 정보를 펼쳐서 확인합니다.</p>

                      {expandedIds.has(notification.id) && notification.source ? (
                        <div className="mt-4 grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-600 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
                          <div className="grid gap-2 md:grid-cols-2">
                            <p>사고 ID: {notification.source.incident_id ?? "-"}</p>
                            <p>사고 코드: {notification.source.incident_code ?? "-"}</p>
                            <p>이벤트 유형: {notification.source.event_type ?? "-"}</p>
                            <p>심각도: {notification.source.severity ?? "-"}</p>
                            <p>CCTV: {notification.source.cctv_id ?? notification.source.source_cctv_id ?? "-"}</p>
                            <p>ROI: {notification.source.roi_type ?? "-"}</p>
                            <p>차량: {notification.source.vehicle_class ?? "-"}</p>
                            <p>신뢰도: {notification.source.confidence ?? "-"}</p>
                            <p>발생 시각: {formatDateTime(notification.source.occurred_at)}</p>
                            <p>생성 시각: {formatDateTime(notification.source.created_at)}</p>
                          </div>

                          <div
                            className="grid gap-3"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            {notification.source.clip_path ? (
                              <div>
                                <p className="mb-2 text-xs font-black text-slate-500">영상 미리보기</p>
                                <video
                                  src={notification.source.clip_path}
                                  controls
                                  preload="metadata"
                                  playsInline
                                  className="max-h-48 w-full rounded-lg border border-slate-200 bg-black"
                                />
                                <a
                                  href={notification.source.clip_path}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="mt-1 inline-block break-all text-[11px] font-bold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700"
                                >
                                  영상 새 탭에서 열기
                                </a>
                              </div>
                            ) : null}

                            {notification.source.snapshot_path ? (
                              <div>
                                <p className="mb-2 text-xs font-black text-slate-500">스냅샷 미리보기</p>
                                <img
                                  src={notification.source.snapshot_path}
                                  alt="이벤트 스냅샷"
                                  loading="lazy"
                                  className="max-h-48 w-full rounded-lg border border-slate-200 bg-white object-contain"
                                />
                                <a
                                  href={notification.source.snapshot_path}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="mt-1 inline-block break-all text-[11px] font-bold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700"
                                >
                                  스냅샷 새 탭에서 열기
                                </a>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeletedIds((current) => {
                        const next = new Set([...current, notification.id]);
                        saveStoredIdSet(DELETED_NOTIFICATION_IDS_KEY, next);
                        return next;
                      });
                    }}
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
