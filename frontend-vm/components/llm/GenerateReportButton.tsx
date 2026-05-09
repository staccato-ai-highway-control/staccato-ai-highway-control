"use client";

import { useState } from "react";
import { generateLlmReport } from "@/lib/api";

export function GenerateReportButton({ incidentId }: { incidentId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleClick() {
    setIsLoading(true);
    setMessage("");
    try {
      await generateLlmReport(incidentId);
      setMessage("LLM 보고서 생성 요청을 보냈습니다.");
    } catch {
      setMessage("현재는 mock 화면으로 보고서를 확인할 수 있습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button onClick={handleClick} disabled={isLoading} className="h-10 rounded-lg bg-staccato px-4 font-bold text-white disabled:opacity-60">
        {isLoading ? "요청 중..." : "LLM 보고서 생성"}
      </button>
      {message ? <p className="text-xs font-semibold text-slate-500">{message}</p> : null}
    </div>
  );
}
