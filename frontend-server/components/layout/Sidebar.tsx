import Link from "next/link";

const items = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/cctvs", label: "CCTV 관제" },
  { href: "/incidents", label: "정차 이벤트" },
  { href: "/reports", label: "신고/영상등록" },
  { href: "/llm-reports/llm-001", label: "LLM 보고서" },
  { href: "/admin/users", label: "관리자 설정" },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-slate-900 text-slate-200 xl:block">
      <Link href="/" className="flex h-16 items-center gap-3 border-b border-white/10 px-5 text-white no-underline">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-staccato font-bold">S</span>
        <span>
          <strong className="block tracking-[0.18em]">STACCATO</strong>
          <small className="text-xs text-slate-400">AI TRAFFIC SAFETY</small>
        </span>
      </Link>
      <nav className="py-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="block px-5 py-3 text-sm font-normal text-slate-200 no-underline hover:bg-white/5">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
