import Link from "next/link";
import type { MouseEventHandler } from "react";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, imageClassName, onClick }: { className?: string; imageClassName?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return (
    <Link href="/" onClick={onClick} className={cn("inline-flex shrink-0 items-center", className)} aria-label="STACCATO 메인으로 이동">
      <img src="/images/logo.png" alt="STACCATO" className={cn("h-8 w-auto object-contain", imageClassName)} />
    </Link>
  );
}
