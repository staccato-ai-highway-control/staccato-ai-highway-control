import {
  BarChart3,
  Bell,
  Bot,
  Cctv,
  ClipboardList,
  Database,
  FileText,
  LayoutDashboard,
  Map,
  MessageSquare,
  Newspaper,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UserCircle,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import type { AuthUser, UserRole } from "@/features/auth/types";

export const USER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "CONTROL_ADMIN",
  "DISPATCH_ADMIN",
  "VIEWER",
];

export const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "최고 관리자",
  CONTROL_ADMIN: "관제 관리자",
  DISPATCH_ADMIN: "출동 관리자",
  VIEWER: "일반 조회 계정",
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
const nonViewerRoles: UserRole[] = [
  "SUPER_ADMIN",
  "CONTROL_ADMIN",
  "DISPATCH_ADMIN",
];

export const navigationSections: NavigationSection[] = [
  {
    title: "공통",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "대시보드", allowedRoles: allRoles },
      { href: "/mypage", icon: UserCircle, label: "마이페이지", allowedRoles: allRoles },
      { href: "/chatbot", icon: Bot, label: "챗봇", allowedRoles: allRoles },
      { href: "/admin/board", icon: Newspaper, label: "게시판", allowedRoles: allRoles },
    ],
  },
  {
    title: "관제",
    items: [
      { href: "/cctvs", icon: Cctv, label: "CCTV 관제/조회", allowedRoles: ["SUPER_ADMIN", "CONTROL_ADMIN", "VIEWER"] },
      { href: "/map", icon: Map, label: "지도 모니터링", allowedRoles: allRoles },
      { href: "/reports", icon: ClipboardList, label: "이상상황/신고 관리", allowedRoles: ["SUPER_ADMIN", "CONTROL_ADMIN"] },
      { href: "/incidents", icon: ShieldCheck, label: "이상상황 조회", allowedRoles: allRoles },
      { href: "/notifications", icon: Bell, label: "실시간 알림", allowedRoles: nonViewerRoles },
      { href: "/llm-reports", icon: FileText, label: "LLM 보고서", allowedRoles: allRoles },
      { href: "/statistics", icon: BarChart3, label: "ITS 연계 조회", allowedRoles: ["SUPER_ADMIN", "CONTROL_ADMIN", "VIEWER"] },
    ],
  },
  {
    title: "출동",
    items: [
      { href: "/incidents", icon: ShieldCheck, label: "출동 관리", allowedRoles: ["SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN"] },
      { href: "/map", icon: Map, label: "지도/위치 확인", allowedRoles: ["SUPER_ADMIN", "DISPATCH_ADMIN"] },
      { href: "/reports/create", icon: ClipboardList, label: "현장 조치 보고", allowedRoles: ["SUPER_ADMIN", "DISPATCH_ADMIN"] },
      { href: "/reports", icon: FileText, label: "출동 결과 작성", allowedRoles: ["SUPER_ADMIN", "DISPATCH_ADMIN"] },
    ],
  },
  {
    title: "관리",
    items: [
      { href: "/admin/signup-requests", icon: Users, label: "회원가입 신청 관리", allowedRoles: ["SUPER_ADMIN"], adminOnly: true },
      { href: "/admin/users", icon: Users, label: "사용자 관리", allowedRoles: ["SUPER_ADMIN"], adminOnly: true },
      { href: "/admin/users", icon: UserCog, label: "권한 관리", allowedRoles: ["SUPER_ADMIN"], adminOnly: true },
      { href: "/admin/security-logs", icon: ShieldCheck, label: "보안 로그", allowedRoles: ["SUPER_ADMIN"], adminOnly: true },
      { href: "/llm-training-data", icon: Database, label: "LLM 학습데이터", allowedRoles: ["SUPER_ADMIN"], adminOnly: true },
      { href: "/settings", icon: SlidersHorizontal, label: "시스템 설정", allowedRoles: ["SUPER_ADMIN"], adminOnly: true },
    ],
  },
];

export function getRoleLabel(role?: string) {
  return role && USER_ROLES.includes(role as UserRole)
    ? roleLabels[role as UserRole]
    : "권한 미지정";
}

export function isActiveAccount(user: AuthUser | null) {
  return user?.account_status?.toUpperCase() === "ACTIVE";
}

export function getUserRole(user: AuthUser | null): UserRole | null {
  if (!user?.role || !USER_ROLES.includes(user.role)) return null;
  return user.role;
}

export function getVisibleNavigationSections(user: AuthUser | null) {
  const role = getUserRole(user);

  if (!role || !isActiveAccount(user)) {
    return navigationSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.href === "/mypage"),
      }))
      .filter((section) => section.items.length > 0);
  }

  return navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // TODO: Menu filtering is UX-only. Backend APIs must enforce the same role checks.
        if (item.adminOnly && role !== "SUPER_ADMIN") return false;
        return item.allowedRoles.includes(role);
      }),
    }))
    .filter((section) => section.items.length > 0);
}
