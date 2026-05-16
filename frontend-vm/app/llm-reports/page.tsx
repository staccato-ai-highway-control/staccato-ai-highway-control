"use client";

import Link from "next/link";
import { CheckCircle2, Edit3, FilePlus2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { mockIncidents } from "@/features/incidents/mock";
import type { Incident } from "@/features/incidents/types";
import { mockLlmReports } from "@/features/llm/mock";
import type { LlmGenerationStatus, LlmReport, LlmReportType } from "@/features/llm/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { cn } from "@/lib/utils";

const reportTypeLabels: Record<LlmReportType, string> = {
  INCIDENT_SUMMARY: "사고 요약",
  INCIDENT_REPORT: "사고 보고서",
};

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

function handleMockAction(message: string) {
  window.alert(message);
}

function getRole(user: AuthUser | null): UserRole | null {
  return user?.role ?? null;
}

function isMaintainerRole(role: UserRole | null) {
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

function getIncidentForReport(report: LlmReport) {
  return mockIncidents.find((incident) => incident.id === report.incidentId);
}

export default function LlmReportsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [reports, setReports] = useState<LlmReport[]>(mockLlmReports);
  const [selectedReportId, setSelectedReportId] = useState(mockLlmReports[0].id);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const role = getRole(authUser);
  const isMaintainer = isMaintainerRole(role);
  const canGenerate = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canEdit = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canConfirm = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canRegenerate = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canDelete = role === "SUPER_ADMIN";

  const visibleReports = useMemo(() => {
    if (!isMaintainer) return reports;

    return reports.filter((report) =>
      isAssignedToUser(getIncidentForReport(report), authUser)
    );
  }, [authUser, isMaintainer, reports]);

  const selectedReport = useMemo(() => {
    return visibleReports.find((report) => report.id === selectedReportId) ?? visibleReports[0];
  }, [selectedReportId, visibleReports]);

  const previewRows: Array<[string, string]> = selectedReport ? [
    ["사고 개요", selectedReport.sections.overview],
    ["발생 위치", selectedReport.sections.location],
    ["AI 탐지 결과", selectedReport.sections.aiDetection],
    ["위험도 판단", selectedReport.sections.riskAssessment],
    ["현재 처리 상태", selectedReport.sections.currentStatus],
    ["조치 필요 사항", selectedReport.sections.requiredActions],
  ] : [];

  const pageDescription = isMaintainer
    ? "본인 배정 사고와 관련된 LLM 보고서를 조회합니다."
    : role === "CONTROL_ADMIN"
      ? "관제 대상 사고 보고서를 생성, 수정, 확정, 재생성합니다."
      : "전체 LLM 보고서를 조회하고 생성, 수정, 확정, 삭제합니다.";

  function handleMockDelete(report: LlmReport) {
    const confirmed = window.confirm(`${report.reportTitle} 보고서를 삭제하시겠습니까?`);
    if (!confirmed) return;

    setReports((current) => current.filter((item) => item.id !== report.id));
  }

  return (
    <RequireAuth>
      <AppLayout title="LLM 보고서">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">LLM 보고서</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {pageDescription}
            </p>
          </div>
          {canGenerate ? (
            <button type="button" onClick={() => handleMockAction("보고서 생성 API 연결 예정입니다.")} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white transition hover:bg-staccato-dark">
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              보고서 생성
            </button>
          ) : null}
        </section>

        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          LLM 결과는 최종 판단이 아니라 관리자 검토용 초안입니다. 확정 전 반드시 사고 정보와 현장 대응 내용을 확인하세요.
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">report_title</th>
                    <th className="px-4 py-3">incident_code</th>
                    <th className="px-4 py-3">report_type</th>
                    <th className="px-4 py-3">generation_status</th>
                    <th className="px-4 py-3">llm_provider</th>
                    <th className="px-4 py-3">llm_model</th>
                    <th className="px-4 py-3">생성자</th>
                    <th className="px-4 py-3">생성 시각</th>
                    <th className="px-4 py-3">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReports.map((report) => (
                    <tr
                      key={report.id}
                      className={cn(
                        "border-t border-slate-100 align-top",
                        selectedReport.id === report.id && "bg-teal-50/60"
                      )}
                    >
                      <td className="px-4 py-4">
                        <button type="button" onClick={() => setSelectedReportId(report.id)} className="text-left font-black text-slate-950 hover:text-teal-700">
                          {report.reportTitle}
                        </button>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{report.incidentCode}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{reportTypeLabels[report.reportType]}</td>
                      <td className="px-4 py-4">
                        <Badge tone={statusTone[report.generationStatus]}>{statusLabels[report.generationStatus]}</Badge>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{report.llmProvider}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{report.llmModel}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{report.generatedBy}</td>
                      <td className="px-4 py-4 font-semibold text-slate-500">{report.generatedAt}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/llm-reports/${report.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">
                            상세 보기
                          </Link>
                          {canEdit ? (
                            <Link href={`/llm-reports/${report.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">
                              <Edit3 className="h-3 w-3" aria-hidden="true" />
                              수정
                            </Link>
                          ) : null}
                          {canRegenerate ? (
                            <button type="button" onClick={() => handleMockAction("재생성 API 연결 예정입니다.")} className="inline-flex items-center gap-1 rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50">
                              <RefreshCw className="h-3 w-3" aria-hidden="true" />
                              재생성
                            </button>
                          ) : null}
                          {canConfirm ? (
                            <button type="button" onClick={() => handleMockAction("확정 API 연결 예정입니다.")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              확정
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button type="button" onClick={() => handleMockDelete(report)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50">
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                              삭제
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleReports.length === 0 ? (
              <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">
                현재 권한으로 조회 가능한 LLM 보고서가 없습니다.
              </p>
            ) : null}
          </Card>

          <Card className="p-5">
            {selectedReport ? (
              <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-slate-400">{selectedReport.incidentCode}</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{selectedReport.reportTitle}</h3>
              </div>
              <Badge tone={statusTone[selectedReport.generationStatus]}>{statusLabels[selectedReport.generationStatus]}</Badge>
            </div>
            <div className="mt-5 grid gap-3">
              {previewRows.map(([label, value]) => (
                <section key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <h4 className="text-xs font-black text-slate-400">{label}</h4>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{value}</p>
                </section>
              ))}
            </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <h3 className="text-lg font-black text-slate-950">선택된 보고서가 없습니다.</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  조회 가능한 보고서가 생기면 이 영역에 미리보기가 표시됩니다.
                </p>
              </div>
            )}
          </Card>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
