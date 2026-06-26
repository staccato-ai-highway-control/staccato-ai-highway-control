import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return <div className="overflow-auto rounded-xl border border-slate-200 bg-white">{children}</div>;
}

