"use client";

import Link from "next/link";
import { ArrowLeft, FileVideo, Pencil, Save, Sparkles, Trash2, X } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorPage } from "@/components/common/ErrorPage";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { deleteReport, getReport, requestReportAnalysis, updateReport } from "@/features/reports/api";
import type { Report, UpdateReportPayload } from "@/features/reports/types";

const reportTypeLabels: Record<string, string> = {
  GENERAL: "일반",
  ACCIDENT: "이벤트",
  LANE_STOP_REPORT: "주행차로 정차",
  SHOULDER_STOP_REPORT: "갓길 정차",
  UNKNOWN_REPORT: "유형 미확인",
};

const purposeLabels: Record<string, string> = {
  ANALYSIS: "분석",
  REPORT: "신고",
  NORMAL_REFERENCE: "정상 참고",
  TEST_DEMO: "테스트 데모",
};

const statusLabels: Record<string, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토중",
  ANALYZING: "분석중",
  CONVERTED_TO_INCIDENT: "이벤트 전환",
  REJECTED: "반려",
  DELETED: "삭제됨",
};

const priorityLabels: Record<string, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  MEDIUM: "중간",
  HIGH: "높음",
  URGENT: "긴급",
};

const reportTypeOptions = ["GENERAL", "ACCIDENT", "LANE_STOP_REPORT", "SHOULDER_STOP_REPORT", "UNKNOWN_REPORT"];
const purposeOptions = ["ANALYSIS", "REPORT", "NORMAL_REFERENCE", "TEST_DEMO"];
const priorityOptions = ["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"];

function getReportId(report: Report) {
  return String(report.id);
}

function getReportCode(report: Report) {
  return report.report_code ?? report.reportCode ?? `#${report.id}`;
}

function getReportTitle(report: Report) {
  return report.title ?? report.subject ?? "제목 없음";
}

function getReportType(report: Report) {
  return report.report_type ?? report.reportType ?? "GENERAL";
}

function getUploadPurpose(report: Report) {
  return report.upload_purpose ?? report.purpose ?? "ANALYSIS";
}

function getReportStatus(report: Report) {
  return report.status ?? "SUBMITTED";
}

function getReportPriority(report: Report) {
  return report.priority ?? "NORMAL";
}

function getReportLocation(report: Report) {
  return report.location ?? report.address ?? report.place_name ?? report.locationName ?? "";
}

function getReportDescription(report: Report) {
  return report.description ?? "";
}

function getReportCreatedAt(report: Report) {
  return report.submitted_at ?? report.created_at ?? report.createdAt ?? "-";
}

function getAnalysisStatus(report: Report) {
  return report.analysis_status ?? report.analysisStatus ?? "WAITING";
}

function getAnalysisSummary(report: Report) {
  return report.analysis_summary ?? report.analysisSummary ?? "분석 결과가 아직 없습니다.";
}

function getBadgeTone(value: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (["REJECTED", "DELETED", "URGENT", "HIGH", "CRITICAL", "FAILED"].includes(value)) return "red";
  if (["ANALYZING", "MEDIUM"].includes(value)) return "amber";
  if (["CONVERTED_TO_INCIDENT", "COMPLETED", "LOW"].includes(value)) return "green";
  if (["REVIEWING", "REQUESTED", "NORMAL"].includes(value)) return "blue";
  return "slate";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-800">{value === null || value === undefined || value === "" ? "-" : value}</dd>
    </div>
  );
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [editDraft, setEditDraft] = useState<UpdateReportPayload>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requestingAnalysis, setRequestingAnalysis] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function beginEdit(nextReport = report) {
    if (!nextReport) return;
    setEditDraft({
      report_type: getReportType(nextReport),
      upload_purpose: getUploadPurpose(nextReport),
      title: getReportTitle(nextReport),
      subject: getReportTitle(nextReport),
      description: getReportDescription(nextReport),
      priority: getReportPriority(nextReport),
      location: getReportLocation(nextReport),
      latitude: nextReport.latitude === null || nextReport.latitude === undefined ? undefined : Number(nextReport.latitude),
      longitude: nextReport.longitude === null || nextReport.longitude === undefined ? undefined : Number(nextReport.longitude),
    });
    setIsEditing(true);
  }

  async function loadReport() {
    setLoading(true);
    setErrorMessage(null);
    setActionError(null);

    try {
      const nextReport = await getReport(id);
      setReport(nextReport);
      if (isEditing) beginEdit(nextReport);
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
    setActionError(null);

    try {
      await requestReportAnalysis(getReportId(report));
      await loadReport();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "AI 분석 요청에 실패했습니다.");
    } finally {
      setRequestingAnalysis(false);
    }
  }

  async function handleUpdate() {
    if (!report) return;
    setSaving(true);
    setActionError(null);

    try {
      const payload: UpdateReportPayload = {
        ...editDraft,
        subject: editDraft.subject ?? editDraft.title,
        latitude: editDraft.latitude === undefined || Number.isNaN(Number(editDraft.latitude)) ? undefined : Number(editDraft.latitude),
        longitude: editDraft.longitude === undefined || Number.isNaN(Number(editDraft.longitude)) ? undefined : Number(editDraft.longitude),
      };
      const nextReport = await updateReport(getReportId(report), payload);
      setReport(nextReport);
      setIsEditing(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "신고 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!report) return;
    const confirmed = window.confirm("신고를 삭제/취소하시겠습니까?");
    if (!confirmed) return;

    setDeleting(true);
    setActionError(null);

    try {
      await deleteReport(getReportId(report));
      router.replace("/reports");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "신고 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
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
          <ErrorPage statusCode={404} title="신고를 찾을 수 없습니다" description={errorMessage ?? "요청한 신고가 존재하지 않거나 접근할 수 없습니다."} actionLabel="신고 목록으로 이동" actionHref="/reports" secondaryActionLabel="대시보드로 이동" secondaryActionHref="/dashboard" />
        </AppLayout>
      </RequireAuth>
    );
  }

  const status = getReportStatus(report);
  const priority = getReportPriority(report);
  const reportType = getReportType(report);
  const purpose = getUploadPurpose(report);
  const analysisStatus = getAnalysisStatus(report);

  return (
    <RequireAuth>
      <AppLayout title="신고 상세">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/reports" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              목록으로
            </Link>
            <h2 className="text-2xl font-black text-slate-950">{getReportTitle(report)}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{getReportCode(report)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={getBadgeTone(status)}>{statusLabels[status] ?? status}</Badge>
            <Badge tone={getBadgeTone(priority)}>{priorityLabels[priority] ?? priority}</Badge>
            <Badge tone={getBadgeTone(analysisStatus)}>{analysisStatus}</Badge>
          </div>
        </section>

        {actionError ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{actionError}</div> : null}

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="grid gap-5">
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-black text-slate-950">기본 정보</h3>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => beginEdit()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    수정
                  </button>
                  <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    삭제
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      신고 유형
                      <select value={editDraft.report_type ?? reportType} onChange={(event) => setEditDraft((current) => ({ ...current, report_type: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3">
                        {reportTypeOptions.map((value) => <option key={value} value={value}>{reportTypeLabels[value] ?? value}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      업로드 목적
                      <select value={editDraft.upload_purpose ?? purpose} onChange={(event) => setEditDraft((current) => ({ ...current, upload_purpose: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3">
                        {purposeOptions.map((value) => <option key={value} value={value}>{purposeLabels[value] ?? value}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      제목
                      <input value={editDraft.title ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value, subject: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      우선순위
                      <select value={editDraft.priority ?? priority} onChange={(event) => setEditDraft((current) => ({ ...current, priority: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3">
                        {priorityOptions.map((value) => <option key={value} value={value}>{priorityLabels[value] ?? value}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                      위치
                      <input value={editDraft.location ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, location: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      위도
                      <input type="number" step="any" value={editDraft.latitude ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, latitude: event.target.value === "" ? undefined : Number(event.target.value) }))} className="h-11 rounded-lg border border-slate-200 px-3" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      경도
                      <input type="number" step="any" value={editDraft.longitude ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, longitude: event.target.value === "" ? undefined : Number(event.target.value) }))} className="h-11 rounded-lg border border-slate-200 px-3" />
                    </label>
                  </div>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    설명
                    <textarea value={editDraft.description ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))} className="min-h-28 rounded-lg border border-slate-200 p-3" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleUpdate} disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "저장 중" : "저장"}</Button>
                    <button type="button" onClick={() => setIsEditing(false)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><X className="h-4 w-4" />취소</button>
                  </div>
                </div>
              ) : (
                <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <InfoRow label="reportCode" value={getReportCode(report)} />
                  <InfoRow label="title" value={getReportTitle(report)} />
                  <InfoRow label="reportType" value={reportTypeLabels[reportType] ?? reportType} />
                  <InfoRow label="purpose" value={purposeLabels[purpose] ?? purpose} />
                  <InfoRow label="reporter" value={report.reporter_name ?? report.reporter ?? report.reporter_id} />
                  <InfoRow label="location" value={getReportLocation(report)} />
                  <InfoRow label="cctvId" value={report.cctv_id} />
                  <InfoRow label="status" value={statusLabels[status] ?? status} />
                  <InfoRow label="priority" value={priorityLabels[priority] ?? priority} />
                  <InfoRow label="riskLevel" value={report.risk_level} />
                  <InfoRow label="createdAt" value={formatDateTime(getReportCreatedAt(report))} />
                  <InfoRow label="updatedAt" value={formatDateTime(report.updated_at)} />
                </dl>
              )}
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
                  <InfoRow label="파일명" value={report.attachment_name ?? report.attachmentName} />
                  <InfoRow label="파일 유형" value={report.attachment_type ?? report.attachmentType} />
                  <InfoRow label="업로드 시간" value={formatDateTime(report.uploaded_at ?? report.uploadedAt)} />
                </dl>
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">AI 분석</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{getAnalysisSummary(report)}</p>
                </div>
                <Badge tone={getBadgeTone(analysisStatus)}>{analysisStatus}</Badge>
              </div>
              <button type="button" onClick={handleRequestAnalysis} disabled={requestingAnalysis} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {requestingAnalysis ? "요청 중" : "분석 요청"}
              </button>
            </Card>
          </div>

          <aside className="grid content-start gap-5">
            <Card className="p-5">
              <h3 className="text-lg font-black text-slate-950">위치 정보</h3>
              <dl className="mt-4 grid gap-3">
                <InfoRow label="위치명" value={report.place_name ?? report.locationName ?? getReportLocation(report)} />
                <InfoRow label="주소" value={report.address} />
                <InfoRow label="위도" value={report.latitude} />
                <InfoRow label="경도" value={report.longitude} />
              </dl>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-black text-slate-950">이벤트 전환 결과</h3>
              {report.converted_incident_id ?? report.convertedIncidentCode ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">이벤트로 전환됨</p>
                  <strong className="mt-1 block text-lg text-emerald-900">{report.converted_incident_id ?? report.convertedIncidentCode}</strong>
                </div>
              ) : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">아직 이벤트로 전환되지 않음</p>}
            </Card>
          </aside>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
