"use client";

import { verifyLlmReport } from "@/lib/api";

export function ReportVerifyButton({ reportId }: { reportId: string }) {
  async function handleClick() {
    await verifyLlmReport(reportId).catch(() => undefined);
  }

  return (
    <button onClick={handleClick} className="h-10 rounded-lg bg-emerald-600 px-4 font-bold text-white">
      확정
    </button>
  );
}
