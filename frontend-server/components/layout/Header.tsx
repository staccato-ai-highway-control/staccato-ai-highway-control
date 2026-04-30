import Link from "next/link";

export function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-5">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-slate-950">{title}</h1>
      </div>
      <span className="hidden text-sm text-slate-500 md:inline">2026. 04. 29</span>
      <Link href="/admin/users" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 no-underline">
        관리자 설정
      </Link>
    </header>
  );
}
