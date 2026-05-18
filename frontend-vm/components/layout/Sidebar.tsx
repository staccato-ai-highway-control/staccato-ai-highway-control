"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { AuthUser } from "@/features/auth/types";
import { getUserRole, getVisibleNavigationSections } from "@/config/navigation";
import { getStoredAuthUser } from "@/lib/authStorage";
import { cn } from "@/lib/utils";

export function Sidebar({
  isMobileOpen = false,
  onMobileClose,
}: {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const visibleSections = getVisibleNavigationSections(authUser);
  const role = getUserRole(authUser) ?? "NO_ROLE";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    if (href === "/") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/55 xl:hidden"
          aria-label="메뉴 닫기"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-slate-900 text-slate-200 shadow-2xl transition-transform duration-200 xl:w-60 xl:translate-x-0 xl:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/"
            onClick={onMobileClose}
            className="block no-underline"
          >
            <img
              src="/images/logo.png"
              alt="STACCATO"
              className="h-9 w-auto object-contain"
            />
          </Link>

          <button
            type="button"
            onClick={onMobileClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 xl:hidden"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          {visibleSections.map((section) => (
            <div key={`${role}-${section.title}`} className="mb-5 last:mb-0">
              <p className="mb-2 px-2 text-xs font-black tracking-[0.18em] text-slate-500">
                {section.title}
              </p>
              <div className="grid gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={`${role}-${section.title}-${item.href}-${item.label}`}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 no-underline transition hover:bg-white/5 hover:text-white",
                        active && "bg-white/10 text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
