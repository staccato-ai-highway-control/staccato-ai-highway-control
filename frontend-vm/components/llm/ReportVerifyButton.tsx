"use client";

import { useState } from "react";
import { confirmLlmReport } from "@/features/llm/api";

export function ReportVerifyButton({ reportId, onConfirmed }: { reportId: string; onConfirmed?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      await confirmLlmReport(reportId);
      onConfirmed?.();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={isLoading} className="h-10 rounded-lg bg-emerald-600 px-4 font-bold text-white disabled:opacity-60">
      {isLoading ? "확정 중..." : "확정"}
    </button>
  );
}
