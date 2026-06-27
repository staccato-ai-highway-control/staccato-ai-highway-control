/**
 * 파일 역할: 실시간 이벤트 기능의 상태와 부수 효과를 재사용 가능한 React 훅으로 캡슐화합니다.
 * 유지보수 참고: 구독 시작과 해제, 비동기 갱신, 오류 복구가 컴포넌트 생명주기와 맞물리므로 정리 로직을 유지해야 합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useState } from "react";
// 코드 설명: socket.io-client 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { io } from "socket.io-client";
// 코드 설명: @/lib/constants 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { API_BASE_URL } from "@/lib/constants";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAccessToken } from "@/lib/authStorage";
// 코드 설명: ./api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { fetchRecentIncidentEvents } from "./api";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { RealtimeConnectionStatus, RealtimeIncidentEvent } from "./types";

// 코드 설명: getEventKey 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getEventKey(event: RealtimeIncidentEvent) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String( event.realtime_event_id ?? event.id ?? `${event.incident_id ?? …
  return String(
    event.realtime_event_id ??
      event.id ??
      `${event.incident_id ?? "incident"}-${event.created_at ?? event.occurred_at ?? Math.random()}`
  );
}

// 코드 설명: getSocketBaseUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getSocketBaseUrl() {
  // 코드 설명: explicitSocketUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const explicitSocketUrl = process.env.NEXT_PUBLIC_SOCKET_BASE_URL ?? process.env.NEXT_PUBLIC_SOCKET_URL;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof window === "undefined"
  if (typeof window === "undefined") {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: explicitSocketUrl ?? API_BASE_URL
    return explicitSocketUrl ?? API_BASE_URL;
  }

  // 코드 설명: rawUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const rawUrl = explicitSocketUrl ?? API_BASE_URL;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !rawUrl || rawUrl.startsWith("/")
  if (!rawUrl || rawUrl.startsWith("/")) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: window.location.origin
    return window.location.origin;
  }

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new URL(rawUrl, window.location.origin).origin
    return new URL(rawUrl, window.location.origin).origin;
  } catch {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: window.location.origin
    return window.location.origin;
  }
}

// 코드 설명: mergeByEventId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function mergeByEventId(current: RealtimeIncidentEvent[], next: RealtimeIncidentEvent[]) {
  // 코드 설명: map 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const map = new Map<string, RealtimeIncidentEvent>();

  // 코드 설명: 목록 또는 조건을 순회하면서 각 항목에 같은 처리 규칙을 적용합니다.
  for (const item of current) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: map.set(getEventKey(item), item);
    map.set(getEventKey(item), item);
  }

  // 코드 설명: 목록 또는 조건을 순회하면서 각 항목에 같은 처리 규칙을 적용합니다.
  for (const item of next) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: map.set(getEventKey(item), item);
    map.set(getEventKey(item), item);
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Array.from(map.values()).sort((a, b) => { const aTime = new Date(a.crea…
  return Array.from(map.values()).sort((a, b) => {
    // 코드 설명: aTime 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const aTime = new Date(a.created_at ?? a.occurred_at ?? 0).getTime();
    // 코드 설명: bTime 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const bTime = new Date(b.created_at ?? b.occurred_at ?? 0).getTime();
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: bTime - aTime
    return bTime - aTime;
  });
}

// 코드 설명: useRealtimeIncidents 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function useRealtimeIncidents(limit = 30) {
  // 코드 설명: [events, setEvents] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [events, setEvents] = useState<RealtimeIncidentEvent[]>([]);
  // 코드 설명: [status, setStatus] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 코드 설명: socketBaseUrl 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const socketBaseUrl = useMemo(() => getSocketBaseUrl(), []);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: disposed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let disposed = false;

    // 코드 설명: loadRecentEvents 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function loadRecentEvents() {
      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: recentEvents 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const recentEvents = await fetchRecentIncidentEvents(limit);

        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) {
          // 코드 설명: setEvents 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setEvents((current) => mergeByEventId(current, recentEvents));
        }
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) {
          // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
          const message = error instanceof Error ? error.message : "최근 실시간 알림을 불러오지 못했습니다.";
          // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setErrorMessage(message);
        }
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadRecentEvents();
    loadRecentEvents();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { disposed = true; }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: disposed = true;
      disposed = true;
    };
  }, [limit]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: accessToken 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const accessToken = getStoredAccessToken();

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !accessToken
    if (!accessToken) {
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus("error");
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("Socket.IO 연결에 필요한 로그인 토큰이 없습니다.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: socket 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const socket = io(socketBaseUrl, {
      path: "/socket.io/",
      transports: ["polling"],
      upgrade: false,
      withCredentials: true,
      auth: {
        token: accessToken,
        accessToken,
        access_token: accessToken,
      },
    });

    // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setStatus("connecting");

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: socket.on("connect", () => { setStatus("connected"); setErrorMessage(nu…
    socket.on("connect", () => {
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus("connected");
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(null);
    });

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: socket.on("disconnect", () => { setStatus("disconnected"); });
    socket.on("disconnect", () => {
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus("disconnected");
    });

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: socket.on("connect_error", () => { setStatus("error"); setErrorMessage(…
    socket.on("connect_error", () => {
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus("error");
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("실시간 알림 서버에 연결할 수 없습니다.");
    });

    // 코드 설명: handleRealtimeEvent 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    function handleRealtimeEvent(payload: RealtimeIncidentEvent | { data?: RealtimeIncidentEvent }) {
      // 코드 설명: event 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const event: RealtimeIncidentEvent =
        typeof payload === "object" && payload !== null && "data" in payload && payload.data
          ? payload.data
          : (payload as RealtimeIncidentEvent);

      // 코드 설명: setEvents 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEvents((current) => mergeByEventId(current, [event]));
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: socket.on("incident.created", handleRealtimeEvent);
    socket.on("incident.created", handleRealtimeEvent);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: socket.on("report.created", handleRealtimeEvent);
    socket.on("report.created", handleRealtimeEvent);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: socket.on("notification.created", handleRealtimeEvent);
    socket.on("notification.created", handleRealtimeEvent);

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { socket.off("incident.created", handleRealtimeEvent); socket.off…
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: socket.off("incident.created", handleRealtimeEvent);
      socket.off("incident.created", handleRealtimeEvent);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: socket.off("report.created", handleRealtimeEvent);
      socket.off("report.created", handleRealtimeEvent);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: socket.off("notification.created", handleRealtimeEvent);
      socket.off("notification.created", handleRealtimeEvent);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: socket.disconnect();
      socket.disconnect();
    };
  }, [socketBaseUrl]);

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { events, status, errorMessage, socketBaseUrl, }
  return {
    events,
    status,
    errorMessage,
    socketBaseUrl,
  };
}
