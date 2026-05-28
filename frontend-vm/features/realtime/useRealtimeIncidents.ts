"use client";

import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "@/lib/constants";
import { getStoredAccessToken } from "@/lib/authStorage";
import { fetchRecentIncidentEvents } from "./api";
import type { RealtimeConnectionStatus, RealtimeIncidentEvent } from "./types";

function getEventKey(event: RealtimeIncidentEvent) {
  return String(
    event.realtime_event_id ??
      event.id ??
      `${event.incident_id ?? "incident"}-${event.created_at ?? event.occurred_at ?? Math.random()}`
  );
}

function getSocketBaseUrl() {
  const explicitSocketUrl = process.env.NEXT_PUBLIC_SOCKET_BASE_URL ?? process.env.NEXT_PUBLIC_SOCKET_URL;

  if (typeof window === "undefined") {
    return explicitSocketUrl ?? API_BASE_URL;
  }

  const rawUrl = explicitSocketUrl ?? API_BASE_URL;

  if (!rawUrl || rawUrl.startsWith("/")) {
    return window.location.origin;
  }

  try {
    return new URL(rawUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

function mergeByEventId(current: RealtimeIncidentEvent[], next: RealtimeIncidentEvent[]) {
  const map = new Map<string, RealtimeIncidentEvent>();

  for (const item of current) {
    map.set(getEventKey(item), item);
  }

  for (const item of next) {
    map.set(getEventKey(item), item);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.created_at ?? a.occurred_at ?? 0).getTime();
    const bTime = new Date(b.created_at ?? b.occurred_at ?? 0).getTime();
    return bTime - aTime;
  });
}

export function useRealtimeIncidents(limit = 30) {
  const [events, setEvents] = useState<RealtimeIncidentEvent[]>([]);
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketBaseUrl = useMemo(() => getSocketBaseUrl(), []);

  useEffect(() => {
    let disposed = false;

    async function loadRecentEvents() {
      try {
        const recentEvents = await fetchRecentIncidentEvents(limit);

        if (!disposed) {
          setEvents((current) => mergeByEventId(current, recentEvents));
        }
      } catch (error) {
        if (!disposed) {
          const message = error instanceof Error ? error.message : "최근 실시간 알림을 불러오지 못했습니다.";
          setErrorMessage(message);
        }
      }
    }

    loadRecentEvents();

    return () => {
      disposed = true;
    };
  }, [limit]);

  useEffect(() => {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
      setStatus("error");
      setErrorMessage("Socket.IO 연결에 필요한 로그인 토큰이 없습니다.");
      return;
    }

    const socket = io(socketBaseUrl, {
      transports: ["polling"],
      withCredentials: true,
      auth: {
        token: accessToken,
        accessToken,
        access_token: accessToken,
      },
    });

    setStatus("connecting");

    socket.on("connect", () => {
      setStatus("connected");
      setErrorMessage(null);
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    socket.on("connect_error", (error) => {
      setStatus("error");
      setErrorMessage(error.message);
    });

    function handleRealtimeEvent(payload: RealtimeIncidentEvent | { data?: RealtimeIncidentEvent }) {
      const event: RealtimeIncidentEvent =
        typeof payload === "object" && payload !== null && "data" in payload && payload.data
          ? payload.data
          : (payload as RealtimeIncidentEvent);

      setEvents((current) => mergeByEventId(current, [event]));
    }

    socket.on("incident.created", handleRealtimeEvent);
    socket.on("report.created", handleRealtimeEvent);
    socket.on("notification.created", handleRealtimeEvent);

    return () => {
      socket.off("incident.created", handleRealtimeEvent);
      socket.off("report.created", handleRealtimeEvent);
      socket.off("notification.created", handleRealtimeEvent);
      socket.disconnect();
    };
  }, [socketBaseUrl]);

  return {
    events,
    status,
    errorMessage,
    socketBaseUrl,
  };
}
