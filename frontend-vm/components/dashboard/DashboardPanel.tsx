import type { ReactNode } from "react";
import { Card } from "@/components/common/Card";
import { cn } from "@/lib/utils";

export function DashboardPanel({
  title,
  children,
  className,
  bodyClassName,
  titleAction,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  titleAction?: ReactNode;
}) {
  return (
    <Card className={cn("flex min-h-72 flex-col overflow-hidden rounded-lg p-5 shadow-none", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        {titleAction}
      </div>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </Card>
  );
}
