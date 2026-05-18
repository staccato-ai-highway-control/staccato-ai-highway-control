"use client";

import { useEffect, useState } from "react";
import { createIncidentLlmReport } from "@/features/llm/api";
import type { AuthUser } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";

function canManageLlmReports(user: AuthUser | null) {
  return user?.role === "SUPER_ADMIN" || user?.role === "CONTROL_ADMIN";
}

export function GenerateReportButton({ incidentId }: { incidentId: string }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  if (!canManageLlmReports(authUser)) {
    return (
      <p className="rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-500">
        LLM 보고서 생성은 최고관리자와 관제관리자만 사용할 수 있습니다.
      </p>
    );
  }

  async function handleClick() {
    setIsLoading(true);
    setMessage("");
    try {
      const report = await createIncidentLlmReport(incidentId, {
        report_type: "INCIDENT_REPORT",
        prompt_version: "v1",
        llm_provider: "LOCAL_LLM",
      });
      setMessage("LLM 보고서 생성 요청을 보냈습니다." + (report.id ? " 보고서 ID: " + report.id : ""));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "LLM 보고서 생성 요청에 실패했습니다.");
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
