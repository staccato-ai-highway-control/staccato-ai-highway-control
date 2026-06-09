import type { AuthUser, UserRole } from "@/features/auth/types";
import type { BoardPost } from "@/features/board/types";

export type BoardCategory = "NOTICE" | "REFERENCE" | "DISCUSSION";
export type BoardRole = Extract<UserRole, "SUPER_ADMIN" | "CONTROL_ADMIN" | "MAINTAINER">;

export type BoardAttachment = {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: string;
  downloadUrl?: string;
};

export type BoardComment = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  isHidden?: boolean;
  replies: BoardComment[];
};

export const categoryLabels: Record<BoardCategory, string> = {
  NOTICE: "공지",
  REFERENCE: "자료",
  DISCUSSION: "토론",
};

export const categoryTone: Record<BoardCategory, "blue" | "green" | "amber"> = {
  NOTICE: "blue",
  REFERENCE: "green",
  DISCUSSION: "amber",
};

export function isBoardCategory(value: string): value is BoardCategory {
  return value === "NOTICE" || value === "REFERENCE" || value === "DISCUSSION";
}

export function getBoardCategory(value: string): BoardCategory {
  return isBoardCategory(value) ? value : "DISCUSSION";
}

export function formatBoardDate(value: string | null | undefined) {
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

export function isMaintainerRole(role: UserRole | null | undefined) {
  return role === "MAINTAINER" || role === "DISPATCH_ADMIN";
}

export function getBoardRole(role: UserRole | null | undefined): BoardRole | null {
  if (role === "SUPER_ADMIN" || role === "CONTROL_ADMIN") return role;
  if (isMaintainerRole(role)) return "MAINTAINER";
  return null;
}

export function getBoardDisplayName(user: AuthUser | null) {
  return user?.name ?? user?.login_id ?? user?.email ?? "사용자";
}

export function getWritableCategories(user: AuthUser | null): BoardCategory[] {
  const role = getBoardRole(user?.role);

  if (role === "SUPER_ADMIN") return ["NOTICE", "REFERENCE", "DISCUSSION"];
  if (role === "CONTROL_ADMIN") return ["REFERENCE", "DISCUSSION"];
  if (role === "MAINTAINER") return ["DISCUSSION"];
  return [];
}

export function canCreatePost(user: AuthUser | null) {
  return getWritableCategories(user).length > 0;
}

export function isSuperAdmin(user: AuthUser | null) {
  return user?.role === "SUPER_ADMIN";
}

export function isOwnPost(post: BoardPost, user: AuthUser | null) {
  if (!user?.id) return false;
  return String(post.author_id) === String(user.id);
}

export function canEditPost(post: BoardPost, user: AuthUser | null) {
  return isSuperAdmin(user) || isOwnPost(post, user);
}

export function canDeletePost(post: BoardPost, user: AuthUser | null) {
  return isSuperAdmin(user) || isOwnPost(post, user);
}

export function canHidePost(user: AuthUser | null) {
  return getBoardRole(user?.role) === "SUPER_ADMIN";
}

export function canManageComments(user: AuthUser | null) {
  return getBoardRole(user?.role) === "SUPER_ADMIN";
}

export function canWriteComments(user: AuthUser | null) {
  return getBoardRole(user?.role) === "SUPER_ADMIN" || getBoardRole(user?.role) === "CONTROL_ADMIN" || getBoardRole(user?.role) === "MAINTAINER";
}

export function getBoardAttachments(_postId: string | number) {
  return [] as BoardAttachment[];
}

export function getBoardComments(_postId: string | number) {
  return [] as BoardComment[];
}
