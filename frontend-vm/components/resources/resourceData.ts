/**
 * 파일 역할: 자료실 영역에서 사용하는 resourceData UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { ResourceCategory, ResourceVisibility } from "@/features/resources/types";

// 코드 설명: resourceCategoryLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const resourceCategoryLabels: Record<ResourceCategory, string> = {
  RESUME: "조원 이력서",
  COVER_LETTER: "자기소개서",
  PRESENTATION: "프로젝트 발표자료",
  MEETING_NOTE: "회의록",
  ACCESS_LOG: "접속 로그",
};

// 코드 설명: resourceCategoryTone 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const resourceCategoryTone: Record<ResourceCategory, "blue" | "green" | "amber" | "red"> = {
  RESUME: "red",
  COVER_LETTER: "amber",
  PRESENTATION: "blue",
  MEETING_NOTE: "green",
  ACCESS_LOG: "blue",
};

// 코드 설명: resourceVisibilityLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const resourceVisibilityLabels: Record<ResourceVisibility, string> = {
  ADMIN_ALL: "전체 관리자",
  SUPER_ADMIN_ONLY: "최고관리자만",
  OWNER_ONLY: "본인만",
};

// 코드 설명: resourceCategoryOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const resourceCategoryOptions: ResourceCategory[] = ["RESUME", "COVER_LETTER", "PRESENTATION", "MEETING_NOTE"];
// 코드 설명: allowedResourceExtensions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const allowedResourceExtensions = ["pdf", "ppt", "pptx", "doc", "docx", "hwp", "hwpx", "md", "txt", "jpg", "jpeg", "png", "zip"];

// 코드 설명: formatResourceDate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function formatResourceDate(value?: string) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "-";

  // 코드 설명: date 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const date = new Date(value);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Number.isNaN(date.getTime())
  if (Number.isNaN(date.getTime())) return value;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", d…
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

// 코드 설명: formatResourceFileSize 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function formatResourceFileSize(bytes: number) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !Number.isFinite(bytes) || bytes <= 0
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: bytes < 1024
  if (bytes < 1024) return `${bytes} B`;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: bytes < 1024 * 1024
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
