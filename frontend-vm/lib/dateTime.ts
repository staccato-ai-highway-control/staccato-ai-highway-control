const TIMEZONE_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:\d{2})$/i;

function normalizeUtcTimestamp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Backend/AI timestamps are treated as UTC when timezone is omitted.
  // Example: 2026-06-04T12:22:37 -> 2026-06-04T12:22:37Z
  if (TIMEZONE_OFFSET_PATTERN.test(trimmed)) return trimmed;
  return `${trimmed}Z`;
}

export function formatKstDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(normalizeUtcTimestamp(value));
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatKstDateTimeShort(value?: string | null) {
  if (!value) return "-";

  const date = new Date(normalizeUtcTimestamp(value));
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
