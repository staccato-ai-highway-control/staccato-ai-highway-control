/**
 * 파일 역할: 설정 화면을 백엔드 없이도 구성하거나 응답 누락을 보완할 때 사용하는 예시 데이터입니다.
 * 유지보수 참고: 실제 API 계약과 같은 타입을 유지해 개발용 데이터가 운영 코드의 가정을 왜곡하지 않도록 합니다.
 */
import type { SystemSettingsData } from "@/features/settings/types";

// 코드 설명: mockSystemSettings 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
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
      maskedValue: "환경변수 사용",
    },
  ],
  socketStatus: {
    id: "socket-io",
    label: "Socket.IO",
    status: "READY",
    description: "실시간 사고/알림 이벤트 수신 대기 상태",
    maskedValue: "환경변수 사용",
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
