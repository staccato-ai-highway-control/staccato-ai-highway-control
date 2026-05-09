import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={cn("inline-flex min-h-10 items-center justify-center rounded-lg bg-staccato px-4 text-sm font-semibold text-white transition hover:bg-staccato-dark disabled:opacity-50", className)}
      {...props}
    >
      {children}
    </button>
  );
}

