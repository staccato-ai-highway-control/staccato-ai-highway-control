"use client";

export function LlmReportEditor({ draft, onChange }: { draft: string; onChange?: (value: string) => void }) {
  return <textarea defaultValue={draft} onChange={(event) => onChange?.(event.target.value)} className="min-h-72 w-full rounded-xl border border-slate-200 p-4 leading-8" />;
}
