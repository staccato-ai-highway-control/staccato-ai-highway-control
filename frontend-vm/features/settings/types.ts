/**
 * 파일 역할: 설정 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type ServiceStatus = "ONLINE" | "READY" | "CONNECTED" | "MOCK" | "LOCAL" | "DEGRADED" | "OFFLINE";

// 코드 설명: SettingsStatusItem 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type SettingsStatusItem = {
  id: string;
  label: string;
  status: ServiceStatus;
  description: string;
  maskedValue?: string;
};

// 코드 설명: SystemInfo 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type SystemInfo = {
  serviceName: string;
  environment: string;
  frontendStatus: ServiceStatus;
  buildMode: string;
  timezone: string;
};

// 코드 설명: NotificationSetting 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type NotificationSetting = {
  id: string;
  label: string;
  enabled: boolean;
  channel: "WEB" | "EMAIL" | "SOCKET";
};

// 코드 설명: SystemSettingsData 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type SystemSettingsData = {
  systemInfo: SystemInfo;
  apiConnections: SettingsStatusItem[];
  socketStatus: SettingsStatusItem;
  aiServerStatus: SettingsStatusItem;
  notificationSettings: NotificationSetting[];
};
