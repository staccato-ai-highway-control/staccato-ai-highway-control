import Link from "next/link";

export type QuickLink = {
  href: string;
  label: string;
  description: string;
};

export function RoleGuideCard({
  title,
  description,
  tone = "blue",
}: {
  title: string;
  description: string;
  tone?: "blue" | "slate" | "amber" | "green";
}) {
  const toneClassName =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "slate"
          ? "border-slate-200 bg-slate-50 text-slate-800"
          : "border-sky-200 bg-sky-50 text-sky-900";

  return (
    <section className={`rounded-lg border p-5 ${toneClassName}`}>
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6">{description}</p>
      <p className="mt-4 text-xs font-bold">API 연동 예정</p>
    </section>
  );
}

export function QuickLinkGrid({ links }: { links: QuickLink[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">바로가기</h3>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {links.map((link) => (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            className="rounded-lg border border-slate-200 p-4 no-underline transition hover:border-sky-300 hover:bg-sky-50"
          >
            <strong className="block text-sm text-slate-950">
              {link.label}
            </strong>
            <span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">
              {link.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
