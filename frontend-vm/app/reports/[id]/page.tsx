"use client";

import Link from "next/link";
import { ArrowLeft, FileVideo, RotateCcw, Save, Sparkles } from "lucide-react";
import { use, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { mockIncidents } from "@/features/incidents/mock";
import type { Incident } from "@/features/incidents/types";
import { mockReports } from "@/features/reports/mock";
import type {
  AnalysisStatus,
  Report,
  ReportPriority,
  ReportProcessingStatus,
  ReportType,
  UploadPurpose,
} from "@/features/reports/types";
import { getStoredAuthUser } from "@/lib/authStorage";

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

function findReport(id: string): Report {
  return mockReports.find((report) => report.id === id) ?? mockReports[0];
}

function getRole(user: AuthUser | null): UserRole | null {
  return user?.role ?? null;
}

function isMaintainerRole(role: UserRole | null) {
  return role === "MAINTAINER" || role === "DISPATCH_ADMIN";
}

function isAssignedToUser(incident: Incident, user: AuthUser | null) {
  const assignee = incident.assignee?.trim();
  if (!assignee || assignee === "미배정") return false;

  const candidates = [user?.name, user?.login_id, user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim());

  return candidates.includes(assignee);
}

function isReportConnectedToIncident(report: Report, incident: Incident) {
  return (
    report.convertedIncidentCode === incident.code ||
    report.cctvId === incident.cctvId ||
    report.location.includes(incident.roadName)
  );
}

function canMaintainerViewReport(report: Report, user: AuthUser | null) {
  return mockIncidents
    .filter((incident) => isAssignedToUser(incident, user))
    .some((incident) => isReportConnectedToIncident(report, incident));
}

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
  const report = findReport(id);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [reviewMemo, setReviewMemo] = useState("");
  const [savedMemos, setSavedMemos] = useState<string[]>([]);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const canManageReport = true;
  const canRequestAnalysis = true;
  const canDeleteReport = true;
  const canViewReport = true;

  function handleMockAction(message: string) {
    window.alert(message);
  }

  function handleSaveMemo() {
    const memo = reviewMemo.trim();

    if (!memo) return;

    setSavedMemos((current) => [memo, ...current]);
    setReviewMemo("");
    window.alert("검토 메모가 저장되었습니다.");
  }

  return (
    <RequireAuth>
      <AppLayout title="신고 상세">
        {!canViewReport ? (
          <Card className="p-6">
            <Link href="/reports" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              목록으로
            </Link>
            <h2 className="text-xl font-black text-slate-950">조회 권한이 없습니다.</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              최고 관리자는 본인에게 배정된 이벤트와 연결된 신고만 조회할 수 있습니다.
            </p>
          </Card>
        ) : (
          <>
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
              <div className="border-b border-slate-200 p-5">
                <h3 className="text-lg font-black text-slate-950">첨부파일</h3>
              </div>
              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
                <div className="grid min-h-80 place-items-center rounded-lg bg-gradient-to-br from-slate-900 via-slate-700 to-sky-200 text-white">
                  <div className="text-center">
                    <FileVideo className="mx-auto h-12 w-12" aria-hidden="true" />
                    <p className="mt-3 text-sm font-black">이미지/영상 미리보기</p>
                    <p className="mt-1 text-xs font-semibold text-white/70">실제 파일 렌더링은 API 연결 후 처리</p>
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
                  <p className="mt-1 text-sm font-semibold text-slate-500">{report.analysisSummary}</p>
                </div>
                <Badge tone={analysisTone[report.analysisStatus]}>{analysisLabels[report.analysisStatus]}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {canRequestAnalysis ? (
                  <>
                    <button type="button" onClick={() => handleMockAction("분석 요청 API 연결 예정입니다.")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      분석 요청
                    </button>
                    <button type="button" onClick={() => handleMockAction("재분석 API 연결 예정입니다.")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      재분석
                    </button>
                  </>
                ) : null}
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

            {canManageReport ? (
              <Card className="p-5">
                <h3 className="text-lg font-black text-slate-950">관리자 검토</h3>
                <textarea
                  value={reviewMemo}
                  onChange={(event) => setReviewMemo(event.target.value)}
                  className="mt-4 min-h-32 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-sky-400"
                  placeholder="검토 메모를 입력하세요."
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={handleSaveMemo} className="inline-flex h-10 items-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white transition hover:bg-staccato-dark">
                    <Save className="h-4 w-4" aria-hidden="true" />
                    저장
                  </button>
                  <button type="button" onClick={() => handleMockAction("신고 상태 변경 API 연결 예정입니다.")} className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                    상태 변경
                  </button>
                  <button type="button" onClick={() => handleMockAction("오탐 처리 API 연결 예정입니다.")} className="inline-flex h-10 items-center rounded-lg border border-sky-200 px-4 text-sm font-bold text-sky-700 transition hover:bg-sky-50">
                    오탐 처리
                  </button>
                  {canDeleteReport ? (
                    <button type="button" onClick={() => handleMockAction("신고 삭제 API 연결 예정입니다.")} className="inline-flex h-10 items-center rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50">
                      신고 삭제
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2">
                  {savedMemos.map((memo, index) => (
                    <p key={`${memo}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-600">{memo}</p>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card className="p-5">
              <h3 className="text-lg font-black text-slate-950">이벤트 전환 결과</h3>
              {report.status === "CONVERTED_TO_INCIDENT" && report.convertedIncidentCode ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">이벤트로 전환됨</p>
                  <strong className="mt-1 block text-lg text-emerald-900">{report.convertedIncidentCode}</strong>
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  아직 이벤트로 전환되지 않음
                </p>
              )}
            </Card>
          </aside>
        </section>
          </>
        )}
      </AppLayout>
    </RequireAuth>
  );
}
