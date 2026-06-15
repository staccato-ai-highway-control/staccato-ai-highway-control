import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function DetailPageHeader({ title, code, backHref, badges, actions }: { title: string; code: string; backHref: string; badges?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_34%),linear-gradient(135deg,#020617,#0f172a_58%,#172554)] px-5 py-6 text-white shadow-xl shadow-slate-950/10 sm:px-7">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 no-underline transition hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />목록으로
      </Link>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">STACCATO DETAIL</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 font-mono text-sm font-bold text-slate-400">{code}</p>
          {badges ? <div className="mt-4 flex flex-wrap gap-2">{badges}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 lg:max-w-[460px] lg:justify-end">{actions}</div> : null}
      </div>
    </header>
  );
}
