"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { LlmReportEditor } from "@/components/llm/LlmReportEditor";
import { LlmReportViewer } from "@/components/llm/LlmReportViewer";
import { ReportVerifyButton } from "@/components/llm/ReportVerifyButton";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { mockIncidents } from "@/features/incidents/mock";
import type { Incident } from "@/features/incidents/types";
import { mockLlmReports } from "@/features/llm/mock";
import type { LlmGenerationStatus, LlmReport } from "@/features/llm/types";
import { getStoredAuthUser } from "@/lib/authStorage";

const statusLabels: Record<LlmGenerationStatus, string> = {
  PENDING: "대기",
  GENERATING: "생성중",
  DRAFT: "초안",
  EDITED: "수정됨",
  CONFIRMED: "확정",
  FAILED: "실패",
};

const statusTone: Record<LlmGenerationStatus, "slate" | "blue" | "green" | "amber" | "red"> = {
  PENDING: "slate",
  GENERATING: "blue",
  DRAFT: "amber",
  EDITED: "blue",
  CONFIRMED: "green",
  FAILED: "red",
};

function isMaintainerRole(role: UserRole | null | undefined) {
  return role === "MAINTAINER" || role === "DISPATCH_ADMIN";
}

function isAssignedToUser(incident: Incident | undefined, user: AuthUser | null) {
  if (!incident) return false;

  const assignee = incident.assignee?.trim();
  if (!assignee || assignee === "미배정") return false;

  const candidates = [user?.name, user?.login_id, user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim());

  return candidates.includes(assignee);
}

function canViewReport(report: LlmReport | undefined, user: AuthUser | null) {
  if (!report) return false;
  if (user?.role === "SUPER_ADMIN" || user?.role === "CONTROL_ADMIN") return true;

  if (isMaintainerRole(user?.role)) {
    const incident = mockIncidents.find((item) => item.id === report.incidentId);
    return isAssignedToUser(incident, user);
  }

  return false;
}

function handleMockAction(message: string) {
  window.alert(message);
}

export default function LlmReportPage() {
  const params = useParams<{ id: string }>();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const report = useMemo(() => {
    return mockLlmReports.find((item) => item.id === params.id);
  }, [params.id]);

  const role = authUser?.role;
  const isMaintainer = isMaintainerRole(role);
  const canEdit = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canConfirm = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canRegenerate = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canDelete = role === "SUPER_ADMIN";
  const isAllowed = canViewReport(report, authUser);

  return (
    <RequireAuth>
      <AppLayout title="LLM 보고서">
        <section className="mb-5">
          <Link href="/llm-reports" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            목록으로
          </Link>
        </section>

        {!report || !isAllowed ? (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-black text-slate-950">조회 가능한 LLM 보고서가 아닙니다.</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              출동관리자는 본인 배정 사고와 관련된 보고서만 조회할 수 있습니다.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-400">{report.incidentCode}</p>
                  <h2 className="mt-1 font-black text-slate-950">보고서 초안 보기</h2>
                </div>
                <Badge tone={statusTone[report.generationStatus]}>{statusLabels[report.generationStatus]}</Badge>
              </div>
              <LlmReportViewer draft={report.draft} />
              <div className="mt-4 flex flex-wrap gap-2">
                {canRegenerate ? (
                  <button type="button" onClick={() => handleMockAction("재생성 API 연결 예정입니다.")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-sky-200 px-4 text-sm font-bold text-sky-700 transition hover:bg-sky-50">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    재생성
                  </button>
                ) : null}
                {canDelete ? (
                  <button type="button" onClick={() => handleMockAction("삭제 API 연결 예정입니다.")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    삭제
                  </button>
                ) : null}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 font-black text-slate-950">
                {canEdit ? "수정" : "조회 전용"}
              </h2>
              {canEdit ? (
                <>
                  <LlmReportEditor draft={report.draft} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleMockAction("저장 API 연결 예정입니다.")} className="h-10 rounded-lg bg-slate-900 px-4 font-bold text-white">
                      저장
                    </button>
                    {canConfirm ? <ReportVerifyButton reportId={report.id} /> : null}
                  </div>
                </>
              ) : (
                <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
                  {isMaintainer
                    ? "출동관리자는 본인 배정 사고 관련 LLM 보고서를 조회만 할 수 있습니다."
                    : "이 계정은 보고서 수정 권한이 없습니다."}
                </p>
              )}
            </Card>
          </div>
        )}
      </AppLayout>
    </RequireAuth>
  );
}
