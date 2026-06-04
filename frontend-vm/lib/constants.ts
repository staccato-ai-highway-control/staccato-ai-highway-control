export const SERVICE_NAME = "STACCATO";

export const MVP_DESCRIPTION =
  "AI 기반 고속도로 정차 차량 탐지 및 교통 관제 시스템";

export const SERVICE_SUBTITLE = "AI Traffic Safety Control System";

const DIRECT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://192.168.0.187:5000";
const API_PROXY_PATH = process.env.NEXT_PUBLIC_API_PROXY_PATH ?? "/backend-api";

export const API_BASE_URL =
  typeof window === "undefined" ? DIRECT_API_BASE_URL : API_PROXY_PATH;
