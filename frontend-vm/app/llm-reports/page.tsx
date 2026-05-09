"use client";

import Link from "next/link";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { mockLlmReports } from "@/features/llm/mock";
import type { LlmGenerationStatus, LlmReport, LlmReportType } from "@/features/llm/types";
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

export default function LlmReportsPage() {
  const [selectedReportId, setSelectedReportId] = useState(mockLlmReports[0].id);

  const selectedReport = useMemo(() => {
    return mockLlmReports.find((report) => report.id === selectedReportId) ?? mockLlmReports[0];
  }, [selectedReportId]);

  const previewRows: Array<[string, string]> = [
    ["사고 개요", selectedReport.sections.overview],
    ["발생 위치", selectedReport.sections.location],
    ["AI 탐지 결과", selectedReport.sections.aiDetection],
    ["위험도 판단", selectedReport.sections.riskAssessment],
    ["현재 처리 상태", selectedReport.sections.currentStatus],
    ["조치 필요 사항", selectedReport.sections.requiredActions],
  ];

  return (
    <RequireAuth>
      <AppLayout title="LLM 보고서">
        <section className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">LLM 보고서</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            사고 이벤트 기반으로 생성된 LLM 보고서 초안을 조회, 수정, 확정합니다.
          </p>
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
                  {mockLlmReports.map((report) => (
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
                          <button type="button" onClick={() => handleMockAction("재생성 API 연결 예정입니다.")} className="inline-flex items-center gap-1 rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50">
                            <RefreshCw className="h-3 w-3" aria-hidden="true" />
                            재생성
                          </button>
                          <button type="button" onClick={() => handleMockAction("확정 API 연결 예정입니다.")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            확정
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
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
          </Card>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
