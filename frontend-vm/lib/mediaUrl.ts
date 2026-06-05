import { API_BASE_URL } from "@/lib/constants";

const AI_MEDIA_PROXY_PREFIXES = ["/events/", "/streams/", "/snapshots/"];
const FLASK_MEDIA_PREFIXES = ["/api/", "/backend-api/", "/event_media/", "/uploads/", "/static/", "/media/"];

function isAiProxyPath(pathname: string) {
  return AI_MEDIA_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPrivateAiOrigin(url: URL) {
  return (
    url.port === "5001" &&
    ["192.168.0.186", "localhost", "127.0.0.1"].includes(url.hostname)
  );
}

export function normalizeMediaUrl(rawUrl?: string | null) {
  if (!rawUrl || rawUrl === "null" || rawUrl === "undefined") return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);

      if (isPrivateAiOrigin(url)) {
        if (isAiProxyPath(url.pathname)) {
          return `${url.pathname}${url.search}${url.hash}`;
        }

        return `/ai-vm${url.pathname}${url.search}${url.hash}`;
      }

      return trimmed;
    } catch {
      return trimmed;
    }
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  if (isAiProxyPath(normalizedPath)) {
    return normalizedPath;
  }

  if (FLASK_MEDIA_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    if (normalizedPath.startsWith("/backend-api/")) return normalizedPath;
    return `${API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
  }

  return normalizedPath;
}
