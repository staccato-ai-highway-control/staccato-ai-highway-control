export type ServiceStatus = "ONLINE" | "READY" | "CONNECTED" | "MOCK" | "LOCAL" | "DEGRADED" | "OFFLINE";

export type SettingsStatusItem = {
  id: string;
  label: string;
  status: ServiceStatus;
  description: string;
  maskedValue?: string;
};

export type SystemInfo = {
  serviceName: string;
  environment: string;
  frontendStatus: ServiceStatus;
  buildMode: string;
  timezone: string;
};

export type NotificationSetting = {
  id: string;
  label: string;
  enabled: boolean;
  channel: "WEB" | "EMAIL" | "SOCKET";
};

export type SystemSettingsData = {
  systemInfo: SystemInfo;
  apiConnections: SettingsStatusItem[];
  socketStatus: SettingsStatusItem;
  aiServerStatus: SettingsStatusItem;
  llmSettings: SettingsStatusItem[];
  notificationSettings: NotificationSetting[];
};
