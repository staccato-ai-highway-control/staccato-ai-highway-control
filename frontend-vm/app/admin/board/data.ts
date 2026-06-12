/**
 * 파일 역할: 관리자 기능을 구성하는 data 모듈입니다.
 * 유지보수 참고: 관련 화면과 데이터 흐름에서 공통으로 사용하는 책임을 모아 유지보수 지점을 명확히 합니다.
 */
import type { AuthUser, UserRole } from "@/features/auth/types";
// 코드 설명: @/features/board/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { BoardPost } from "@/features/board/types";

// 코드 설명: BoardCategory 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type BoardCategory = "NOTICE" | "REFERENCE" | "DISCUSSION";
// 코드 설명: BoardRole 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type BoardRole = Extract<UserRole, "SUPER_ADMIN" | "CONTROL_ADMIN" | "MAINTAINER">;

// 코드 설명: BoardAttachment 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type BoardAttachment = {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: string;
  downloadUrl?: string;
};

// 코드 설명: BoardComment 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type BoardComment = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  isHidden?: boolean;
  replies: BoardComment[];
};

// 코드 설명: categoryLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const categoryLabels: Record<BoardCategory, string> = {
  NOTICE: "공지",
  REFERENCE: "자료",
  DISCUSSION: "토론",
};

// 코드 설명: categoryTone 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const categoryTone: Record<BoardCategory, "blue" | "green" | "amber"> = {
  NOTICE: "blue",
  REFERENCE: "green",
  DISCUSSION: "amber",
};

// 코드 설명: isBoardCategory 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function isBoardCategory(value: string): value is BoardCategory {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: value === "NOTICE" || value === "REFERENCE" || value === "DISCUSSION"
  return value === "NOTICE" || value === "REFERENCE" || value === "DISCUSSION";
}

// 코드 설명: getBoardCategory 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getBoardCategory(value: string): BoardCategory {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: isBoardCategory(value) ? value : "DISCUSSION"
  return isBoardCategory(value) ? value : "DISCUSSION";
}

// 코드 설명: formatBoardDate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function formatBoardDate(value: string | null | undefined) {
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

// 코드 설명: isMaintainerRole 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function isMaintainerRole(role: UserRole | null | undefined) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: role === "MAINTAINER" || role === "DISPATCH_ADMIN"
  return role === "MAINTAINER" || role === "DISPATCH_ADMIN";
}

// 코드 설명: getBoardRole 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getBoardRole(role: UserRole | null | undefined): BoardRole | null {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: role === "SUPER_ADMIN" || role === "CONTROL_ADMIN"
  if (role === "SUPER_ADMIN" || role === "CONTROL_ADMIN") return role;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isMaintainerRole(role)
  if (isMaintainerRole(role)) return "MAINTAINER";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
  return null;
}

// 코드 설명: getBoardDisplayName 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getBoardDisplayName(user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: user?.name ?? user?.login_id ?? user?.email ?? "사용자"
  return user?.name ?? user?.login_id ?? user?.email ?? "사용자";
}

// 코드 설명: getWritableCategories 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getWritableCategories(user: AuthUser | null): BoardCategory[] {
  // 코드 설명: role 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const role = getBoardRole(user?.role);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: role === "SUPER_ADMIN"
  if (role === "SUPER_ADMIN") return ["NOTICE", "REFERENCE", "DISCUSSION"];
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: role === "CONTROL_ADMIN"
  if (role === "CONTROL_ADMIN") return ["REFERENCE", "DISCUSSION"];
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: role === "MAINTAINER"
  if (role === "MAINTAINER") return ["DISCUSSION"];
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: []
  return [];
}

// 코드 설명: canCreatePost 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function canCreatePost(user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getWritableCategories(user).length > 0
  return getWritableCategories(user).length > 0;
}

// 코드 설명: isSuperAdmin 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function isSuperAdmin(user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: user?.role === "SUPER_ADMIN"
  return user?.role === "SUPER_ADMIN";
}

// 코드 설명: isOwnPost 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function isOwnPost(post: BoardPost, user: AuthUser | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !user?.id
  if (!user?.id) return false;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String(post.author_id) === String(user.id)
  return String(post.author_id) === String(user.id);
}

// 코드 설명: canEditPost 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function canEditPost(post: BoardPost, user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: isSuperAdmin(user) || isOwnPost(post, user)
  return isSuperAdmin(user) || isOwnPost(post, user);
}

// 코드 설명: canDeletePost 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function canDeletePost(post: BoardPost, user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: isSuperAdmin(user) || isOwnPost(post, user)
  return isSuperAdmin(user) || isOwnPost(post, user);
}

// 코드 설명: canHidePost 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function canHidePost(user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getBoardRole(user?.role) === "SUPER_ADMIN"
  return getBoardRole(user?.role) === "SUPER_ADMIN";
}

// 코드 설명: canManageComments 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function canManageComments(user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getBoardRole(user?.role) === "SUPER_ADMIN"
  return getBoardRole(user?.role) === "SUPER_ADMIN";
}

// 코드 설명: canWriteComments 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function canWriteComments(user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getBoardRole(user?.role) === "SUPER_ADMIN" || getBoardRole(user?.role) …
  return getBoardRole(user?.role) === "SUPER_ADMIN" || getBoardRole(user?.role) === "CONTROL_ADMIN" || getBoardRole(user?.role) === "MAINTAINER";
}

// 코드 설명: getBoardAttachments 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getBoardAttachments(_postId: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: [] as BoardAttachment[]
  return [] as BoardAttachment[];
}

// 코드 설명: getBoardComments 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getBoardComments(_postId: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: [] as BoardComment[]
  return [] as BoardComment[];
}
