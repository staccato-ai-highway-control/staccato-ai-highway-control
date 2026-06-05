import {
  Bell,
  Cctv,
  ClipboardList,
  LayoutDashboard,
  PlaySquare,
  ShieldCheck,
  Newspaper,
  MessageSquareText,
  FileText,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import type { AuthUser, UserRole } from "@/features/auth/types";

export const USER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "AUTH_ADMIN",
  "CONTROL_ADMIN",
  "MAINTAINER",
  "DISPATCH_ADMIN",
  "VIEWER",
];

export const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "최고 관리자",
  CONTROL_ADMIN: "관제 관리자",
  DISPATCH_ADMIN: "출동 관리자",
  VIEWER: "일반 조회 계정",

  // MVP 제외 권한
  AUTH_ADMIN: "미사용 권한",
  MAINTAINER: "미사용 권한",
};

export type NavigationItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  allowedRoles: UserRole[];
  adminOnly?: boolean;
};

export type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const allRoles = USER_ROLES;

export const navigationSections: NavigationSection[] = [
  {
    title: "통합 관제",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "대시보드", allowedRoles: allRoles },
      { href: "/cctvs", icon: Cctv, label: "CCTV 관제", allowedRoles: allRoles },
    ],
  },
  {
    title: "신고 관리",
    items: [
      { href: "/reports/create", icon: ClipboardList, label: "신고 등록", allowedRoles: allRoles },
      { href: "/reports", icon: ClipboardList, label: "신고 목록", allowedRoles: allRoles },
    ],
  },
  {
    title: "이벤트",
    items: [
      { href: "/incidents", icon: ShieldCheck, label: "이벤트 관리", allowedRoles: allRoles },
      { href: "/replay", icon: PlaySquare, label: "리플레이", allowedRoles: allRoles },
      { href: "/notifications", icon: Bell, label: "알림", allowedRoles: allRoles },
    ],
  },
  {
    title: "관리",
    items: [
      { href: "/admin/users", icon: Users, label: "사용자 관리", allowedRoles: allRoles },
      { href: "/settings", icon: SlidersHorizontal, label: "시스템 설정", allowedRoles: allRoles },
      { href: "/board", icon: Newspaper, label: "게시판", allowedRoles: allRoles },
      { href: "/bug-reports", icon: MessageSquareText, label: "버그리포트", allowedRoles: allRoles },
      { href: "/resources", icon: FileText, label: "자료실", allowedRoles: allRoles },
    ],
  },
];

export function getRoleLabel(role?: string) {
  return role && USER_ROLES.includes(role as UserRole)
    ? roleLabels[role as UserRole]
    : "최고 관리자";
}

export function isActiveAccount(user: AuthUser | null) {
  return user?.account_status?.toUpperCase() === "ACTIVE";
}

export function getUserRole(user: AuthUser | null): UserRole | null {
  if (!user?.role || !USER_ROLES.includes(user.role)) return null;
  return user.role;
}

export function getVisibleNavigationSections(user: AuthUser | null) {
  if (!getUserRole(user) || !isActiveAccount(user)) {
    return navigationSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.href === "/dashboard"),
      }))
      .filter((section) => section.items.length > 0);
  }

  return navigationSections;
}
