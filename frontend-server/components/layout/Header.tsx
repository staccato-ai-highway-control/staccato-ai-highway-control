"use client";

import { Bell, LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Header({ title }: { title: string }) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    function updateTime() {
      setCurrentTime(
        new Intl.DateTimeFormat("ko-KR", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date())
      );
    }

    updateTime();
    const timer = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function handleLogout() {
    localStorage.removeItem("accessToken");
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-4 border-b border-slate-200 bg-white px-5 py-3">
      <h1 className="sr-only">{title}</h1>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          placeholder="CCTV, 사고, 관리자 검색..."
          className="h-10 w-full max-w-xl rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
        />
      </div>
      <span className="hidden whitespace-nowrap text-sm font-semibold text-slate-500 lg:inline">
        {currentTime}
      </span>
      <button
        type="button"
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        aria-label="알림"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-staccato" />
      </button>
      <div className="hidden min-w-0 items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 md:flex">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-sm font-black text-white">
          김
        </div>
        <div className="min-w-0">
          <strong className="block truncate text-sm text-slate-950">김관제</strong>
          <span className="block truncate text-xs font-semibold text-slate-500">최고관리자</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">로그아웃</span>
      </button>
    </header>
  );
}
