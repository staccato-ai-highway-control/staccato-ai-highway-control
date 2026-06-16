import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InfoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid gap-x-5 gap-y-0 sm:grid-cols-2", className)}>{children}</dl>;
}

export function InfoItem({ label, value, className }: { label: string; value?: ReactNode; className?: string }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className={cn("min-w-0 border-b border-slate-100 py-3.5", className)}>
      <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="mt-1.5 min-w-0 break-words text-sm font-bold leading-6 text-slate-800 [overflow-wrap:anywhere]">{empty ? "-" : value}</dd>
    </div>
  );
}
