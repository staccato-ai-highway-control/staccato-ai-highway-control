import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-sky-50 text-sky-700 border border-sky-200",
  green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border border-amber-200",
  red: "bg-red-50 text-red-700 border border-red-200",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex min-h-6 items-center rounded-full px-2 text-xs font-semibold", tones[tone])}>{children}</span>;
}

