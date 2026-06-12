/**
 * 파일 역할: 마이페이지 영역에서 사용하는 RolePageShared UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import Link from "next/link";

// 코드 설명: QuickLink 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type QuickLink = {
  href: string;
  label: string;
  description: string;
};

// 코드 설명: RoleGuideCard 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function RoleGuideCard({
  title,
  description,
  tone = "blue",
}: {
  title: string;
  description: string;
  tone?: "blue" | "slate" | "amber" | "green";
}) {
  // 코드 설명: toneClassName 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const toneClassName =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "slate"
          ? "border-slate-200 bg-slate-50 text-slate-800"
          : "border-sky-200 bg-sky-50 text-sky-900";

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <section className={`rounded-lg border p-5 ${toneClassName}`}>
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6">{description}</p>
      <p className="mt-4 text-xs font-bold">API 연동 예정</p>
    </section>
  );
}

// 코드 설명: QuickLinkGrid 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function QuickLinkGrid({ links }: { links: QuickLink[] }) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
