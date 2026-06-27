/**
 * 파일 역할: 여러 화면이 공유하는 애플리케이션 구성값과 표시 규칙을 선언합니다.
 * 유지보수 참고: 메뉴, 권한, 라우트 간의 연결 관계가 포함될 수 있으므로 변경 시 접근 가능한 사용자 역할을 함께 점검합니다.
 */
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
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ComponentType } from "react";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser, UserRole } from "@/features/auth/types";

// 코드 설명: USER_ROLES 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const USER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "AUTH_ADMIN",
  "CONTROL_ADMIN",
  "MAINTAINER",
  "DISPATCH_ADMIN",
  "VIEWER",
];

// 코드 설명: roleLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "최고 관리자",
  CONTROL_ADMIN: "관제 관리자",
  DISPATCH_ADMIN: "출동 관리자",
  VIEWER: "일반 조회 계정",

  // MVP 제외 권한
  AUTH_ADMIN: "미사용 권한",
  MAINTAINER: "미사용 권한",
};

// 코드 설명: NavigationItem 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type NavigationItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  allowedRoles: UserRole[];
  adminOnly?: boolean;
};

// 코드 설명: NavigationSection 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

// 코드 설명: allRoles 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const allRoles = USER_ROLES;

// 코드 설명: navigationSections 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
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
      { href: "/settings", icon: SlidersHorizontal, label: "운영 환경 정보", allowedRoles: allRoles },
      { href: "/board", icon: Newspaper, label: "게시판", allowedRoles: allRoles },
      { href: "/resources", icon: FileText, label: "자료실", allowedRoles: allRoles },
      { href: "/bug-reports", icon: MessageSquareText, label: "버그리포트", allowedRoles: allRoles },
    ],
  },
];

// 코드 설명: getRoleLabel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getRoleLabel(role?: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: role && USER_ROLES.includes(role as UserRole) ? roleLabels[role as User…
  return role && USER_ROLES.includes(role as UserRole)
    ? roleLabels[role as UserRole]
    : "최고 관리자";
}

// 코드 설명: isActiveAccount 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function isActiveAccount(user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: user?.account_status?.toUpperCase() === "ACTIVE"
  return user?.account_status?.toUpperCase() === "ACTIVE";
}

// 코드 설명: getUserRole 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getUserRole(user: AuthUser | null): UserRole | null {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !user?.role || !USER_ROLES.includes(user.role)
  if (!user?.role || !USER_ROLES.includes(user.role)) return null;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: user.role
  return user.role;
}

// 코드 설명: getVisibleNavigationSections 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function getVisibleNavigationSections(user: AuthUser | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !getUserRole(user) || !isActiveAccount(user)
  if (!getUserRole(user) || !isActiveAccount(user)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: navigationSections .map((section) => ({ ...section, items: section.item…
    return navigationSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.href === "/dashboard"),
      }))
      .filter((section) => section.items.length > 0);
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: navigationSections
  return navigationSections;
}
