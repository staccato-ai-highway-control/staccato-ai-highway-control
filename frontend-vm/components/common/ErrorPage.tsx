"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";

export type ErrorPageProps = {
  statusCode?: number;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
};

function ActionButton({
  children,
  href,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white no-underline transition hover:bg-staccato-dark"
      : "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function ErrorPage({
  statusCode,
  title,
  description,
  actionLabel = "대시보드로 이동",
  actionHref,
  onAction,
  secondaryActionLabel = "이전 페이지로 돌아가기",
  secondaryActionHref,
  onSecondaryAction,
}: ErrorPageProps) {
  const primaryHref = actionHref ?? (onAction ? undefined : "/dashboard");

  const handleBack = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
      return;
    }

    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  return (
    <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        {statusCode ? <p className="text-6xl font-black tracking-tight text-staccato">{statusCode}</p> : null}
        <h1 className="mt-5 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-slate-500">{description}</p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <ActionButton href={primaryHref} onClick={onAction} variant="primary">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            {actionLabel}
          </ActionButton>
          {secondaryActionLabel ? (
            <ActionButton href={secondaryActionHref} onClick={secondaryActionHref ? undefined : handleBack} variant="secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {secondaryActionLabel}
            </ActionButton>
          ) : null}
        </div>
      </section>
    </main>
  );
}
