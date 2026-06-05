import type { ResourceCategory, ResourceVisibility } from "@/features/resources/types";

export const resourceCategoryLabels: Record<ResourceCategory, string> = {
  RESUME: "조원 이력서",
  COVER_LETTER: "자기소개서",
  PRESENTATION: "프로젝트 발표자료",
  MEETING_NOTE: "회의록",
};

export const resourceCategoryTone: Record<ResourceCategory, "blue" | "green" | "amber" | "red"> = {
  RESUME: "red",
  COVER_LETTER: "amber",
  PRESENTATION: "blue",
  MEETING_NOTE: "green",
};

export const resourceVisibilityLabels: Record<ResourceVisibility, string> = {
  ADMIN_ALL: "전체 관리자",
  SUPER_ADMIN_ONLY: "최고관리자만",
  OWNER_ONLY: "본인만",
};

export const resourceCategoryOptions: ResourceCategory[] = ["RESUME", "COVER_LETTER", "PRESENTATION", "MEETING_NOTE"];
export const allowedResourceExtensions = ["pdf", "ppt", "pptx", "doc", "docx", "hwp", "hwpx", "md", "txt", "jpg", "jpeg", "png", "zip"];

export function formatResourceDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatResourceFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
