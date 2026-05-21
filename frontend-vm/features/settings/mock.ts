import type { SystemSettingsData } from "@/features/settings/types";

export const mockSystemSettings: SystemSettingsData = {
  systemInfo: {
    serviceName: "STACCATO Frontend Server",
    environment: "LOCAL",
    frontendStatus: "ONLINE",
    buildMode: "Next.js App Router",
    timezone: "Asia/Seoul",
  },
  apiConnections: [
    {
      id: "flask-api",
      label: "Flask API",
      status: "ONLINE",
      description: "프론트엔드가 호출하는 단일 백엔드 API Gateway",
      maskedValue: "http://localhost:****",
    },
  ],
  socketStatus: {
    id: "socket-io",
    label: "Socket.IO",
    status: "READY",
    description: "실시간 사고/알림 이벤트 수신 대기 상태",
    maskedValue: "ws://localhost:****",
  },
  aiServerStatus: {
    id: "ai-server",
    label: "AI Server",
    status: "CONNECTED",
    description: "Flask Server를 통해 확인한 AI 분석 서버 연결 상태 mock",
    maskedValue: "internal://ai-server:****",
  },
  notificationSettings: [
    { id: "incident-alert", label: "신규 이벤트 알림", enabled: true, channel: "WEB" },
    { id: "analysis-done", label: "AI 분석 완료 알림", enabled: true, channel: "SOCKET" },
    { id: "security-event", label: "보안 이벤트 알림", enabled: false, channel: "EMAIL" },
  ],
};
