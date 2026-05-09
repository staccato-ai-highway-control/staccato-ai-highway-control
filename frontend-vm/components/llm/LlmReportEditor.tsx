"use client";

export function LlmReportEditor({ draft }: { draft: string }) {
  return <textarea defaultValue={draft} className="min-h-72 w-full rounded-xl border border-slate-200 p-4 leading-8" />;
}

