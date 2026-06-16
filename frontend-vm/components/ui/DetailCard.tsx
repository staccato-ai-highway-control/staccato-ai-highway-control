import type { ReactNode } from "react";
import { Card } from "@/components/common/Card";

export function DetailCard({ title, description, actions, children, className = "" }: { title: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-base font-black text-slate-950">{title}</h2>{description ? <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}</div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
