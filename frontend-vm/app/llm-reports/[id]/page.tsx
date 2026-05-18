"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { LlmReportEditor } from "@/components/llm/LlmReportEditor";
import { LlmReportViewer } from "@/components/llm/LlmReportViewer";
import { ReportVerifyButton } from "@/components/llm/ReportVerifyButton";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { deleteLlmReport, getLlmReport, regenerateLlmReport, updateLlmReport } from "@/features/llm/api";
import type { LlmGenerationStatus, LlmReport } from "@/features/llm/types";
import { getStoredAuthUser } from "@/lib/authStorage";

const statusLabels: Record<LlmGenerationStatus, string> = {
  PENDING: "대기",
  GENERATING: "생성중",
  DRAFT: "초안",
  EDITED: "수정됨",
  CONFIRMED: "확정",
  FAILED: "실패",
  DELETED: "삭제됨",
};

const statusTone: Record<LlmGenerationStatus, "slate" | "blue" | "green" | "amber" | "red"> = {
  PENDING: "slate",
  GENERATING: "blue",
  DRAFT: "amber",
  EDITED: "blue",
  CONFIRMED: "green",
  FAILED: "red",
  DELETED: "slate",
};

function canManage(role: UserRole | null | undefined) {
  return role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
}

export default function LlmReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [report, setReport] = useState<LlmReport | null>(null);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());

    let ignore = false;
    async function loadReport() {
      try {
        setIsLoading(true);
        const nextReport = await getLlmReport(params.id);
        if (ignore) return;
        setReport(nextReport);
        setDraft(nextReport.reportContent ?? nextReport.draft ?? "");
        setErrorMessage("");
      } catch (error) {
        if (!ignore) setErrorMessage(error instanceof Error ? error.message : "LLM 보고서를 불러오지 못했습니다.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadReport();
    return () => {
      ignore = true;
    };
  }, [params.id]);

  const canEdit = canManage(authUser?.role);
  const canDelete = authUser?.role === "SUPER_ADMIN";

  async function handleSave() {
    if (!report) return;
    setIsSaving(true);
    setMessage("");
    try {
      const updated = await updateLlmReport(report.id, {
        report_title: report.reportTitle,
        summary: report.summary,
        report_content: draft,
      });
      setReport(updated);
      setDraft(updated.reportContent ?? updated.draft ?? draft);
      setMessage("보고서를 저장했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "보고서 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegenerate() {
    if (!report) return;
    const regenerated = await regenerateLlmReport(report.id);
    setReport(regenerated);
    setDraft(regenerated.reportContent ?? regenerated.draft ?? "");
    setMessage("보고서 재생성을 요청했습니다.");
  }

  async function handleDelete() {
    if (!report) return;
    if (!window.confirm(report.reportTitle + " 보고서를 삭제하시겠습니까?")) return;
    await deleteLlmReport(report.id);
    router.push("/llm-reports");
  }

  return (
    <RequireAuth>
      <AppLayout title="LLM 보고서">
        <section className="mb-5">
          <Link href="/llm-reports" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            목록으로
          </Link>
        </section>

        {errorMessage ? (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-black text-slate-950">LLM 보고서를 불러오지 못했습니다.</h2>
            <p className="mt-2 text-sm font-semibold text-red-600">{errorMessage}</p>
          </Card>
        ) : null}

        {isLoading ? <Card className="p-8 text-center text-sm font-semibold text-slate-500">보고서를 불러오는 중입니다.</Card> : null}

        {report ? (
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-400">{report.incidentCode}</p>
                  <h2 className="mt-1 font-black text-slate-950">{report.reportTitle}</h2>
                </div>
                <Badge tone={statusTone[report.generationStatus]}>{statusLabels[report.generationStatus]}</Badge>
              </div>
              <LlmReportViewer draft={report.reportContent ?? report.draft} />
              <div className="mt-4 flex flex-wrap gap-2">
                {canEdit ? (
                  <button type="button" onClick={handleRegenerate} className="inline-flex h-10 items-center gap-2 rounded-lg border border-sky-200 px-4 text-sm font-bold text-sky-700 transition hover:bg-sky-50">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    재생성
                  </button>
                ) : null}
                {canDelete ? (
                  <button type="button" onClick={handleDelete} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    삭제
                  </button>
                ) : null}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 font-black text-slate-950">{canEdit ? "수정" : "조회 전용"}</h2>
              {canEdit ? (
                <>
                  <LlmReportEditor draft={draft} onChange={setDraft} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" disabled={isSaving} onClick={handleSave} className="h-10 rounded-lg bg-slate-900 px-4 font-bold text-white disabled:opacity-60">
                      {isSaving ? "저장 중..." : "저장"}
                    </button>
                    <ReportVerifyButton reportId={report.id} onConfirmed={() => setReport((current) => current ? { ...current, generationStatus: "CONFIRMED", verified: true } : current)} />
                  </div>
                  {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
                </>
              ) : (
                <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
                  이 계정은 보고서 수정 권한이 없습니다.
                </p>
              )}
            </Card>
          </div>
        ) : null}
      </AppLayout>
    </RequireAuth>
  );
}
