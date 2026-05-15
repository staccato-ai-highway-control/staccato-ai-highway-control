import type { AuthUser, UserRole } from "@/features/auth/types";

export type BoardCategory = "NOTICE" | "REFERENCE" | "DISCUSSION";
export type BoardRole = Extract<UserRole, "SUPER_ADMIN" | "CONTROL_ADMIN" | "MAINTAINER">;

export type AdminBoardPost = {
  id: string;
  title: string;
  category: BoardCategory;
  author: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  content: string;
  isHidden?: boolean;
  commentsCount: number;
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

export const boardPosts: AdminBoardPost[] = [
  {
    id: "1",
    title: "5월 관제센터 정기 점검 안내",
    category: "NOTICE",
    author: "STACCATO Super Admin",
    createdAt: "2026. 05. 04. 09:10",
    updatedAt: "2026. 05. 04. 09:10",
    views: 42,
    commentsCount: 2,
    content:
      "5월 정기 점검은 2026년 5월 8일 02:00부터 04:00까지 진행됩니다. 점검 시간 동안 일부 관제 화면의 실시간 갱신이 지연될 수 있습니다.",
  },
  {
    id: "2",
    title: "CCTV 장애 대응 매뉴얼 v1.2",
    category: "REFERENCE",
    author: "김관리",
    createdAt: "2026. 05. 02. 14:35",
    updatedAt: "2026. 05. 03. 10:12",
    views: 31,
    commentsCount: 5,
    content:
      "CCTV 스트림 단절, ROI 오탐, AI 탐지 지연 상황별 점검 절차를 정리했습니다. 현장 점검 전 네트워크 상태와 장비 전원 로그를 먼저 확인해주세요.",
  },
  {
    id: "3",
    title: "야간 정차 차량 알림 기준 조정 의견",
    category: "DISCUSSION",
    author: "이순찰",
    createdAt: "2026. 04. 30. 18:20",
    updatedAt: "2026. 04. 30. 18:20",
    views: 18,
    commentsCount: 8,
    content:
      "야간 시간대 갓길 정차 알림이 다소 민감하게 발생한다는 의견이 있어 기준 조정이 필요한지 논의하고자 합니다.",
  },
  {
    id: "4",
    title: "출동 완료 보고서 작성 방식 제안",
    category: "DISCUSSION",
    author: "박순찰",
    createdAt: "2026. 04. 29. 16:05",
    updatedAt: "2026. 04. 29. 16:05",
    views: 12,
    commentsCount: 3,
    content:
      "출동 완료 후 관제자에게 공유할 처리 결과 항목을 위치, 안전조치, 후속 요청으로 나누어 작성하면 좋겠습니다.",
  },
];

export function getBoardPost(id: string) {
  return boardPosts.find((post) => post.id === id);
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

export function isOwnPost(post: AdminBoardPost, user: AuthUser | null) {
  const candidates = [user?.name, user?.login_id, user?.email].filter(Boolean);
  return candidates.some((value) => post.author === value);
}

export function canEditPost(post: AdminBoardPost, user: AuthUser | null) {
  const role = getBoardRole(user?.role);

  if (role === "SUPER_ADMIN") return true;
  if (role === "CONTROL_ADMIN") return post.category !== "NOTICE" && isOwnPost(post, user);
  if (role === "MAINTAINER") return post.category === "DISCUSSION" && isOwnPost(post, user);
  return false;
}

export function canDeletePost(post: AdminBoardPost, user: AuthUser | null) {
  const role = getBoardRole(user?.role);

  if (role === "SUPER_ADMIN") return true;
  if (role === "CONTROL_ADMIN") return post.category !== "NOTICE" && isOwnPost(post, user);
  return false;
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
