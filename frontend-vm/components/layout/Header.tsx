"use client";

import { Bell, ChevronDown, LogOut, Menu, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/features/auth/types";
import { getRoleLabel } from "@/config/navigation";
import { clearStoredAuth, getStoredAuthUser } from "@/lib/authStorage";

function getDisplayName(user: AuthUser | null) {
  return user?.name ?? user?.login_id ?? user?.email ?? "사용자";
}

type HeaderBadge = {
  label: string;
  className: string;
};

function getRoleHeader(user: AuthUser | null, fallbackTitle: string): { title: string; badges: HeaderBadge[] } {
  return {
    title: fallbackTitle || "통합 관제",
    badges: [
      { label: getRoleLabel(user?.role), className: "border-sky-200 bg-sky-50 text-sky-700" },
      { label: "실시간 이벤트", className: "border-amber-200 bg-amber-50 text-amber-700" },
      { label: "시스템 정상", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    ],
  };
}

export function Header({
  title,
  isMobileMenuOpen,
  onMobileMenuToggle,
}: {
  title: string;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}) {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  function handleLogout() {
    clearStoredAuth();
    router.replace("/login");
  }

  const displayName = getDisplayName(authUser);
  const roleHeader = getRoleHeader(authUser, title);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50 xl:hidden"
          aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={Boolean(isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        <h1 className="truncate text-lg font-black text-slate-950 md:text-xl">{roleHeader.title}</h1>
        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          {roleHeader.badges.map((badge) => (
            <span
              key={badge.label}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${badge.className}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      <Link
        href="/notifications"
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        aria-label="알림"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-staccato" />
      </Link>


      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          className="inline-flex h-10 max-w-[220px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          aria-label="계정 메뉴"
          aria-expanded={isAccountMenuOpen}
        >
          <span className="hidden rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-black text-sky-700 md:inline-flex">
            {getRoleLabel(authUser?.role)}
          </span>
          <span className="truncate">{displayName}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </button>

        {isAccountMenuOpen ? (
          <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <Link
              href="/mypage"
              onClick={() => setIsAccountMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 no-underline transition hover:bg-slate-50"
            >
              <UserCircle className="h-4 w-4" aria-hidden="true" />
              마이페이지
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              로그아웃
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
