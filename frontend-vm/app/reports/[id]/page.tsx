"use client";

import Link from "next/link";
import { ArrowLeft, FileVideo, RotateCcw, Save, Sparkles } from "lucide-react";
import { use, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { getReport, requestReportAnalysis } from "@/features/reports/api";
import type { AnalysisStatus, Report, ReportPriority, ReportProcessingStatus, ReportType, UploadPurpose } from "@/features/reports/types";

const reportTypeLabels: Record<ReportType, string> = {
  GENERAL: "일반",
  ACCIDENT: "이벤트",
  LANE_STOP_REPORT: "주행차로 정차",
  SHOULDER_STOP_REPORT: "갓길 정차",
  UNKNOWN_REPORT: "유형 미확인",
};

const purposeLabels: Record<UploadPurpose, string> = {
  ANALYSIS: "분석",
  REPORT: "신고",
  NORMAL_REFERENCE: "정상 참고",
  TEST_DEMO: "테스트 데모",
};

const statusLabels: Record<ReportProcessingStatus, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토중",
  ANALYZING: "AI 분석중",
  CONVERTED_TO_INCIDENT: "이벤트 전환",
  REJECTED: "반려",
};

const priorityLabels: Record<ReportPriority, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  MEDIUM: "중간",
  HIGH: "높음",
  URGENT: "긴급",
};

const analysisLabels: Record<AnalysisStatus, string> = {
  WAITING: "분석 대기",
  REQUESTED: "분석 요청",
  ANALYZING: "분석 중",
  COMPLETED: "분석 완료",
  FAILED: "분석 실패",
};

const statusTone: Record<ReportProcessingStatus, "slate" | "blue" | "green" | "amber" | "red"> = {
  SUBMITTED: "slate",
  REVIEWING: "blue",
  ANALYZING: "amber",
  CONVERTED_TO_INCIDENT: "green",
  REJECTED: "red",
};

const priorityTone: Record<ReportPriority, "slate" | "blue" | "green" | "amber" | "red"> = {
  LOW: "slate",
  NORMAL: "blue",
  MEDIUM: "blue",
  HIGH: "amber",
  URGENT: "red",
};

const analysisTone: Record<AnalysisStatus, "slate" | "blue" | "green" | "amber" | "red"> = {
  WAITING: "slate",
  REQUESTED: "blue",
  ANALYZING: "amber",
  COMPLETED: "green",
  FAILED: "red",
};

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-800">{value || "-"}</dd>
    </div>
  );
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [reviewMemo, setReviewMemo] = useState("");
  const [savedMemos, setSavedMemos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestingAnalysis, setRequestingAnalysis] = useState(false);

  async function loadReport() {
    setLoading(true);
    setErrorMessage(null);

    try {
      setReport(await getReport(id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "신고 상세를 불러오지 못했습니다.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [id]);

  async function handleRequestAnalysis() {
    if (!report) return;
    setRequestingAnalysis(true);
    setErrorMessage(null);

    try {
      await requestReportAnalysis(report.id);
      setReport({ ...report, status: "ANALYZING", analysisStatus: "REQUESTED" });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 분석 요청에 실패했습니다.");
    } finally {
      setRequestingAnalysis(false);
    }
  }

  function handleSaveMemo() {
    const memo = reviewMemo.trim();
    if (!memo) return;
    setSavedMemos((current) => [memo, ...current]);
    setReviewMemo("");
  }

  if (loading) {
    return (
      <RequireAuth>
        <AppLayout title="신고 상세">
          <Card className="p-8 text-center text-sm font-semibold text-slate-500">신고 상세를 불러오는 중입니다.</Card>
        </AppLayout>
      </RequireAuth>
    );
  }

  if (!report) {
    return (
      <RequireAuth>
        <AppLayout title="신고 상세">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-black text-slate-950">신고를 찾을 수 없습니다.</h2>
            {errorMessage ? <p className="mt-3 text-sm font-semibold text-red-600">{errorMessage}</p> : null}
            <Link href="/reports" className="mt-5 inline-flex no-underline"><Button type="button">목록으로</Button></Link>
          </Card>
        </AppLayout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppLayout title="신고 상세">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/reports" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              목록으로
            </Link>
            <h2 className="text-2xl font-black text-slate-950">{report.title}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{report.reportCode}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone[report.status]}>{statusLabels[report.status]}</Badge>
            <Badge tone={priorityTone[report.priority]}>{priorityLabels[report.priority]}</Badge>
            <Badge tone={analysisTone[report.analysisStatus]}>{analysisLabels[report.analysisStatus]}</Badge>
          </div>
        </section>

        {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="grid gap-5">
            <Card className="p-5">
              <h3 className="mb-4 text-lg font-black text-slate-950">기본 정보</h3>
              <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <InfoRow label="reportCode" value={report.reportCode} />
                <InfoRow label="title" value={report.title} />
                <InfoRow label="reportType" value={reportTypeLabels[report.reportType]} />
                <InfoRow label="purpose" value={purposeLabels[report.purpose]} />
                <InfoRow label="reporter" value={report.reporter} />
                <InfoRow label="location" value={report.location} />
                <InfoRow label="cctvId" value={report.cctvId} />
                <InfoRow label="status" value={statusLabels[report.status]} />
                <InfoRow label="priority" value={priorityLabels[report.priority]} />
                <InfoRow label="analysisStatus" value={analysisLabels[report.analysisStatus]} />
                <InfoRow label="createdAt" value={report.createdAt} />
                <InfoRow label="attachmentName" value={report.attachmentName} />
              </dl>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 p-5"><h3 className="text-lg font-black text-slate-950">첨부파일</h3></div>
              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
                <div className="grid min-h-80 place-items-center rounded-lg bg-gradient-to-br from-slate-900 via-slate-700 to-sky-200 text-white">
                  <div className="text-center">
                    <FileVideo className="mx-auto h-12 w-12" aria-hidden="true" />
                    <p className="mt-3 text-sm font-black">이미지/영상 미리보기</p>
                    <p className="mt-1 text-xs font-semibold text-white/70">파일 렌더링 API가 확정되면 연결합니다.</p>
                  </div>
                </div>
                <dl className="grid content-start gap-3">
                  <InfoRow label="파일명" value={report.attachmentName} />
                  <InfoRow label="파일 유형" value={report.attachmentType === "image" ? "이미지" : "영상"} />
                  <InfoRow label="업로드 시간" value={report.uploadedAt ?? report.createdAt} />
                </dl>
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">AI 분석</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{report.analysisSummary ?? "분석 결과가 아직 없습니다."}</p>
                </div>
                <Badge tone={analysisTone[report.analysisStatus]}>{analysisLabels[report.analysisStatus]}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleRequestAnalysis} disabled={requestingAnalysis} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  분석 요청
                </button>
                <button type="button" onClick={handleRequestAnalysis} disabled={requestingAnalysis} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  재분석
                </button>
              </div>
            </Card>
          </div>

          <aside className="grid content-start gap-5">
            <Card className="p-5">
              <h3 className="text-lg font-black text-slate-950">위치 정보</h3>
              <dl className="mt-4 grid gap-3">
                <InfoRow label="위치명" value={report.locationName ?? report.location} />
                <InfoRow label="도로명" value={report.roadName} />
                <InfoRow label="CCTV ID" value={report.cctvId} />
              </dl>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-black text-slate-950">검토 메모</h3>
              <textarea value={reviewMemo} onChange={(event) => setReviewMemo(event.target.value)} className="mt-4 min-h-32 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-sky-400" placeholder="검토 메모를 입력하세요." />
              <button type="button" onClick={handleSaveMemo} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white transition hover:bg-staccato-dark">
                <Save className="h-4 w-4" aria-hidden="true" />
                저장
              </button>
              <div className="mt-4 grid gap-2">
                {savedMemos.map((memo, index) => <p key={`${memo}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-600">{memo}</p>)}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-black text-slate-950">이벤트 전환 결과</h3>
              {report.status === "CONVERTED_TO_INCIDENT" && report.convertedIncidentCode ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">이벤트로 전환됨</p>
                  <strong className="mt-1 block text-lg text-emerald-900">{report.convertedIncidentCode}</strong>
                </div>
              ) : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">아직 이벤트로 전환되지 않음</p>}
            </Card>
          </aside>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
