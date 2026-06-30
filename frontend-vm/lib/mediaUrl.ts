/**
 * 파일 역할: mediaUrl 관련 처리를 여러 기능에서 재사용할 수 있도록 제공하는 공통 유틸리티입니다.
 * 유지보수 참고: 호출 범위가 넓으므로 입력 경계값과 브라우저/서버 실행 환경 차이를 고려해 동작을 변경해야 합니다.
 */
import { API_BASE_URL } from "@/lib/constants";

const FLASK_MEDIA_PREFIXES = ["/api/", "/backend-api/", "/event_media/", "/uploads/", "/static/", "/media/"];
const EVENT_MEDIA_TYPES = new Set(["snapshot", "video", "stream"]);
const REPORT_ANALYSIS_MEDIA_TYPES = new Set(["snapshot", "video"]);

function isPrivateAiOrigin(url: URL) {
  if (url.port !== "5001") return false;
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
  return /^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname);
}

function normalizeAiMediaPath(pathname: string) {
  const eventMatch = pathname.match(/^\/(?:api\/)?(?:ai-media\/)?events\/([^/]+)\/([^/]+)\/?$/);
  if (eventMatch && EVENT_MEDIA_TYPES.has(eventMatch[2])) {
    return `/api/ai-media/events/${encodeURIComponent(eventMatch[1])}/${encodeURIComponent(eventMatch[2])}`;
  }

  const reportMatch = pathname.match(/^\/(?:api\/)?(?:ai-media\/)?report-analysis\/jobs\/(\d+)\/([^/]+)\/?$/);
  if (reportMatch && REPORT_ANALYSIS_MEDIA_TYPES.has(reportMatch[2])) {
    return `/api/ai-media/report-analysis/jobs/${encodeURIComponent(reportMatch[1])}/${encodeURIComponent(reportMatch[2])}`;
  }

  return null;
}

export function normalizeMediaUrl(rawUrl?: string | null) {
  if (!rawUrl || rawUrl === "null" || rawUrl === "undefined") return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const proxyPath = normalizeAiMediaPath(url.pathname);

      if (proxyPath) return proxyPath;
      if (isPrivateAiOrigin(url)) return null;

      return trimmed;
    } catch {
      return trimmed;
    }
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  const aiMediaPath = normalizeAiMediaPath(normalizedPath);
  if (aiMediaPath) return aiMediaPath;

  if (normalizedPath.startsWith("/ai-media/")) return null;

  if (FLASK_MEDIA_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    if (normalizedPath.startsWith("/backend-api/") || normalizedPath.startsWith("/api/")) return normalizedPath;
    return `${API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
  }

  return normalizedPath;
}
