import { apiClient } from "@/lib/apiClient";

export function getHealth() {
  return apiClient("/health", { auth: false });
}

export function getPublicConfig() {
  return apiClient<{ kakaoMapJsKey?: string; data?: { kakaoMapJsKey?: string } }>("/api/config/public", { auth: false });
}
