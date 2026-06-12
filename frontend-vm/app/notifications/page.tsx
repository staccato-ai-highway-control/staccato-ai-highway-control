/**
 * 파일 역할: 알림 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { LucideIcon } from "lucide-react";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Bell, CheckCheck, Radio, ShieldAlert, Sparkles, Trash2, UserCheck } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useMemo, useState } from "react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/features/realtime/useRealtimeIncidents 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRealtimeIncidents } from "@/features/realtime/useRealtimeIncidents";
// 코드 설명: @/features/realtime/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { RealtimeConnectionStatus, RealtimeIncidentEvent } from "@/features/realtime/types";
// 코드 설명: @/lib/dateTime 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { formatKstDateTime } from "@/lib/dateTime";
// 코드 설명: @/lib/mediaUrl 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { normalizeMediaUrl } from "@/lib/mediaUrl";

// 코드 설명: NotificationType 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type NotificationType = "INCIDENT" | "AI_ANALYSIS" | "REPORT" | "ADMIN" | "SYSTEM";
// 코드 설명: NotificationFilter 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type NotificationFilter = "ALL" | "UNREAD" | NotificationType;

// 코드 설명: NotificationItem 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  source?: RealtimeIncidentEvent;
};

// 코드 설명: NotificationMediaSource 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type NotificationMediaSource = RealtimeIncidentEvent & {
  video_url?: string | null;
  snapshot_url?: string | null;
  preview_url?: string | null;
  preview_type?: "video" | "image" | string | null;
};

// 코드 설명: filterOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const filterOptions: Array<{ label: string; value: NotificationFilter }> = [
  { label: "전체", value: "ALL" },
  { label: "읽지 않음", value: "UNREAD" },
  { label: "실시간 이벤트", value: "INCIDENT" },
  { label: "AI 분석", value: "AI_ANALYSIS" },
  { label: "신고", value: "REPORT" },
  { label: "관리", value: "ADMIN" },
  { label: "시스템", value: "SYSTEM" },
];

// 코드 설명: typeMeta 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const typeMeta: Record<NotificationType, { label: string; tone: "blue" | "green" | "amber" | "red" | "slate"; icon: LucideIcon }> = {
  INCIDENT: { label: "실시간 이벤트", tone: "red", icon: ShieldAlert },
  AI_ANALYSIS: { label: "AI 분석", tone: "green", icon: Sparkles },
  REPORT: { label: "신고", tone: "blue", icon: Bell },
  ADMIN: { label: "관리", tone: "amber", icon: UserCheck },
  SYSTEM: { label: "시스템", tone: "slate", icon: Radio },
};

// 코드 설명: connectionMeta 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const connectionMeta: Record<RealtimeConnectionStatus, { label: string; tone: "blue" | "green" | "amber" | "red" | "slate" }> = {
  connecting: { label: "연결 중", tone: "amber" },
  connected: { label: "실시간 연결 정상", tone: "green" },
  disconnected: { label: "연결 끊김", tone: "slate" },
  error: { label: "연결 오류", tone: "red" },
};

// 코드 설명: READ_NOTIFICATION_IDS_KEY 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const READ_NOTIFICATION_IDS_KEY = "staccato:notifications:readIds";
// 코드 설명: DELETED_NOTIFICATION_IDS_KEY 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const DELETED_NOTIFICATION_IDS_KEY = "staccato:notifications:deletedIds";

// 코드 설명: loadStoredIdSet 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function loadStoredIdSet(key: string) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof window === "undefined"
  if (typeof window === "undefined") return new Set<string>();

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: raw 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const raw = window.localStorage.getItem(key);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !raw
    if (!raw) return new Set<string>();

    // 코드 설명: parsed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const parsed = JSON.parse(raw);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !Array.isArray(parsed)
    if (!Array.isArray(parsed)) return new Set<string>();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Set(parsed.filter((item): item is string => typeof item === "string…
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Set<string>()
    return new Set<string>();
  }
}

// 코드 설명: saveStoredIdSet 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function saveStoredIdSet(key: string, values: Set<string>) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof window === "undefined"
  if (typeof window === "undefined") return;

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: 브라우저 localStorage의 인증 또는 사용자 설정 값을 읽거나 갱신합니다.
    window.localStorage.setItem(key, JSON.stringify(Array.from(values)));
  } catch {
    // localStorage 저장 실패는 알림 표시 자체를 막지 않습니다.
  }
}

// 코드 설명: matchesFilter 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function matchesFilter(notification: NotificationItem, filter: NotificationFilter) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: filter === "ALL"
  if (filter === "ALL") return true;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: filter === "UNREAD"
  if (filter === "UNREAD") return !notification.isRead;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: notification.type === filter
  return notification.type === filter;
}

// 코드 설명: getEventKey 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getEventKey(event: RealtimeIncidentEvent) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String( event.realtime_event_id ?? event.id ?? `${event.incident_id ?? …
  return String(
    event.realtime_event_id ??
      event.id ??
      `${event.incident_id ?? "incident"}-${event.created_at ?? event.occurred_at ?? ""}`
  );
}


// 코드 설명: buildIncidentTitle 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function buildIncidentTitle(event: RealtimeIncidentEvent) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: event.incident_code
  if (event.incident_code) return `사고 이벤트 ${event.incident_code}`;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: event.event_type
  if (event.event_type) return `실시간 이벤트 ${event.event_type}`;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "실시간 이벤트 발생"
  return "실시간 이벤트 발생";
}

// 코드 설명: buildIncidentMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function buildIncidentMessage(event: RealtimeIncidentEvent) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: event.message
  if (event.message) return event.message;

  // 코드 설명: parts 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const parts = [
    event.severity ? `심각도: ${event.severity}` : null,
    event.cctv_id ? `CCTV: ${event.cctv_id}` : null,
    event.vehicle_class ? `차량: ${event.vehicle_class}` : null,
    event.confidence ? `신뢰도: ${event.confidence}` : null,
  ].filter(Boolean);

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: parts.length > 0 ? parts.join(" · ") : "새로운 실시간 사고 이벤트가 수신되었습니다."
  return parts.length > 0 ? parts.join(" · ") : "새로운 실시간 사고 이벤트가 수신되었습니다.";
}

// 코드 설명: getNotificationVideoUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getNotificationVideoUrl(source?: RealtimeIncidentEvent) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !source
  if (!source) return null;

  // 코드 설명: mediaSource 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const mediaSource = source as NotificationMediaSource;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeMediaUrl( mediaSource.clip_path ?? mediaSource.video_url ?? (m…
  return normalizeMediaUrl(
    mediaSource.clip_path ??
      mediaSource.video_url ??
      (mediaSource.preview_type === "video" ? mediaSource.preview_url : null) ??
      null
  );
}

// 코드 설명: getNotificationSnapshotUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getNotificationSnapshotUrl(source?: RealtimeIncidentEvent) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !source
  if (!source) return null;

  // 코드 설명: mediaSource 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const mediaSource = source as NotificationMediaSource;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeMediaUrl( mediaSource.snapshot_path ?? mediaSource.snapshot_ur…
  return normalizeMediaUrl(
    mediaSource.snapshot_path ??
      mediaSource.snapshot_url ??
      (mediaSource.preview_type !== "video" ? mediaSource.preview_url : null) ??
      null
  );
}

// 코드 설명: toNotificationItem 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function toNotificationItem(event: RealtimeIncidentEvent, readIds: Set<string>, deletedIds: Set<string>): NotificationItem | null {
  // 코드 설명: id 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const id = getEventKey(event);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: deletedIds.has(id)
  if (deletedIds.has(id)) return null;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { id, type: "INCIDENT", title: buildIncidentTitle(event), message: buil…
  return {
    id,
    type: "INCIDENT",
    title: buildIncidentTitle(event),
    message: buildIncidentMessage(event),
    createdAt: formatKstDateTime(event.created_at ?? event.occurred_at),
    isRead: readIds.has(id),
    source: event,
  };
}



// 코드 설명: NotificationsPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function NotificationsPage() {
  // 코드 설명: { events, status, errorMessage, socketBaseUrl } 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const { events, status, errorMessage, socketBaseUrl } = useRealtimeIncidents(30);
  // 코드 설명: [filter, setFilter] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  // 코드 설명: [readIds, setReadIds] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [readIds, setReadIds] = useState<Set<string>>(() => loadStoredIdSet(READ_NOTIFICATION_IDS_KEY));
  // 코드 설명: [deletedIds, setDeletedIds] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => loadStoredIdSet(DELETED_NOTIFICATION_IDS_KEY));
  // 코드 설명: [expandedIds, setExpandedIds] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // 코드 설명: notifications 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const notifications = useMemo(
    () =>
      events
        .map((event) => toNotificationItem(event, readIds, deletedIds))
        .filter((item): item is NotificationItem => Boolean(item)),
    [events, readIds, deletedIds]
  );

  // 코드 설명: filteredNotifications 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => matchesFilter(notification, filter)),
    [filter, notifications]
  );

  // 코드 설명: unreadCount 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  // 코드 설명: connection 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const connection = connectionMeta[status];

  // 코드 설명: markAsRead 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function markAsRead(notificationId: string) {
    // 코드 설명: setReadIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setReadIds((current) => {
      // 코드 설명: next 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const next = new Set([...current, notificationId]);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: saveStoredIdSet(READ_NOTIFICATION_IDS_KEY, next);
      saveStoredIdSet(READ_NOTIFICATION_IDS_KEY, next);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: next
      return next;
    });
  }

  // 코드 설명: openNotification 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function openNotification(notification: NotificationItem) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: markAsRead(notification.id);
    markAsRead(notification.id);
    // 코드 설명: setExpandedIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setExpandedIds((current) => {
      // 코드 설명: next 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const next = new Set(current);

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: next.has(notification.id)
      if (next.has(notification.id)) {
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: next.delete(notification.id);
        next.delete(notification.id);
      } else {
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: next.add(notification.id);
        next.add(notification.id);
      }

      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: next
      return next;
    });
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
              // 코드 설명: next 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
              const next = new Set(notifications.map((item) => item.id));
              // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: saveStoredIdSet(READ_NOTIFICATION_IDS_KEY, next);
              saveStoredIdSet(READ_NOTIFICATION_IDS_KEY, next);
              // 코드 설명: setReadIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
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
            // 코드 설명: meta 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const meta = typeMeta[notification.type];
            // 코드 설명: Icon 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const Icon = meta.icon;
            // 코드 설명: videoUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const videoUrl = getNotificationVideoUrl(notification.source);
            // 코드 설명: snapshotUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const snapshotUrl = getNotificationSnapshotUrl(notification.source);

            // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
            return (
              <article
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={() => openNotification(notification)}
                onKeyDown={(event) => {
                  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: event.key === "Enter" || event.key === " "
                  if (event.key === "Enter" || event.key === " ") {
                    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
                    event.preventDefault();
                    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: openNotification(notification);
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
                            <p>발생 시각: {formatKstDateTime(notification.source.occurred_at)}</p>
                            <p>생성 시각: {formatKstDateTime(notification.source.created_at)}</p>
                          </div>

                          <div
                            className="grid gap-3"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            {videoUrl ? (
                              <div>
                                <p className="mb-2 text-xs font-black text-slate-500">영상 미리보기</p>
                                <video
                                  src={videoUrl}
                                  controls
                                  preload="metadata"
                                  playsInline
                                  className="max-h-48 w-full rounded-lg border border-slate-200 bg-black"
                                />
                                <a
                                  href={videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="mt-1 inline-block break-all text-[11px] font-bold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700"
                                >
                                  영상 새 탭에서 열기
                                </a>
                              </div>
                            ) : null}

                            {snapshotUrl ? (
                              <div>
                                <p className="mb-2 text-xs font-black text-slate-500">스냅샷 미리보기</p>
                                <img
                                  src={snapshotUrl}
                                  alt="이벤트 스냅샷"
                                  loading="lazy"
                                  className="max-h-48 w-full rounded-lg border border-slate-200 bg-white object-contain"
                                />
                                <a
                                  href={snapshotUrl}
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
                      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.stopPropagation();
                      event.stopPropagation();
                      // 코드 설명: setDeletedIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
                      setDeletedIds((current) => {
                        // 코드 설명: next 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                        const next = new Set([...current, notification.id]);
                        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: saveStoredIdSet(DELETED_NOTIFICATION_IDS_KEY, next);
                        saveStoredIdSet(DELETED_NOTIFICATION_IDS_KEY, next);
                        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: next
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
