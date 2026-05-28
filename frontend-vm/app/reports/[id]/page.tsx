"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Save, Sparkles, Trash2, X } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorPage } from "@/components/common/ErrorPage";
import { ReportAttachmentPreview } from "@/components/report/ReportAttachmentPreview";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { deleteReport, getReport, requestReportAnalysis, updateReport } from "@/features/reports/api";
import type { Report, ReportAttachment, UpdateReportPayload } from "@/features/reports/types";

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

type ReportWithAliases = Report & {
  report_id?: number | string | null;
  reportCode?: string | null;
  reportType?: string | null;
  riskLevel?: string | null;
  cctvId?: number | string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  reporterName?: string | null;
  reporterId?: number | string | null;
  placeName?: string | null;
  attachment_id?: number | string | null;
  attachmentId?: number | string | null;
  attachment_count?: number | null;
  attachmentCount?: number | null;
  attachment_name?: string | null;
  attachmentName?: string | null;
  original_filename?: string | null;
  filename?: string | null;
  attachment_type?: string | null;
  attachmentType?: string | null;
  mime_type?: string | null;
  file_type?: string | null;
  file_url?: string | null;
  previewUrl?: string | null;
  thumbnailUrl?: string | null;
  downloadUrl?: string | null;
  uploadedAt?: string | null;
  analysis_job_id?: number | string | null;
  analysisJobId?: number | string | null;
  analysis_jobs?: Report["analysis_jobs"];
  analysisJobs?: Report["analysis_jobs"];
};

function hasDisplayValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "undefined" && normalized !== "null";
}

function pickValue<T>(...values: Array<T | null | undefined>) {
  return values.find(hasDisplayValue);
}

function pickString(...values: Array<string | number | null | undefined>) {
  const value = pickValue(...values);
  return value === undefined ? undefined : String(value).trim();
}

function getReportLocationDraftValue(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.location, normalized.address, normalized.place_name, normalized.locationName, normalized.placeName) ?? "";
}

function getReportLatitudeValue(report: Report) {
  const value = pickString(report.latitude);
  if (!value) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getReportLongitudeValue(report: Report) {
  const value = pickString(report.longitude);
  if (!value) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeAttachments(report: ReportWithAliases): ReportAttachment[] | undefined {
  const attachments = report.attachments?.filter(Boolean) ?? [];
  const fallbackAttachmentId = pickString(report.attachment_id, report.attachmentId);
  const fallbackPreviewUrl = pickString(report.preview_url, report.previewUrl, report.thumbnail_url, report.thumbnailUrl, report.file_url);
  const fallbackDownloadUrl = pickString(report.download_url, report.downloadUrl);
  const fallbackFileName = pickString(report.original_filename, report.filename, report.attachment_name, report.attachmentName);
  const fallbackFileType = pickString(report.mime_type, report.file_type, report.attachment_type, report.attachmentType);
  const fallbackUploadedAt = pickString(report.uploaded_at, report.uploadedAt);

  if (!fallbackAttachmentId && !fallbackPreviewUrl && !fallbackDownloadUrl && !fallbackFileName && attachments.length === 0) {
    return attachments.length > 0 ? attachments : undefined;
  }

  const fallbackAttachment: ReportAttachment = {
    id: fallbackAttachmentId,
    attachment_id: fallbackAttachmentId,
    original_filename: fallbackFileName,
    filename: fallbackFileName,
    mime_type: fallbackFileType,
    file_type: fallbackFileType,
    file_url: pickString(report.file_url),
    preview_url: fallbackPreviewUrl,
    download_url: fallbackDownloadUrl,
    uploaded_at: fallbackUploadedAt,
  };

  if (attachments.length === 0) return [fallbackAttachment];

  const [firstAttachment, ...restAttachments] = attachments;
  return [
    {
      ...fallbackAttachment,
      ...firstAttachment,
      id: pickString(firstAttachment.id, firstAttachment.attachment_id, fallbackAttachmentId),
      attachment_id: pickString(firstAttachment.attachment_id, firstAttachment.id, fallbackAttachmentId),
      original_filename: pickString(firstAttachment.original_filename, firstAttachment.filename, fallbackFileName),
      filename: pickString(firstAttachment.filename, firstAttachment.original_filename, fallbackFileName),
      mime_type: pickString(firstAttachment.mime_type, firstAttachment.file_type, fallbackFileType),
      file_type: pickString(firstAttachment.file_type, firstAttachment.mime_type, fallbackFileType),
      preview_url: pickString(firstAttachment.preview_url, firstAttachment.file_url, fallbackPreviewUrl),
      download_url: pickString(firstAttachment.download_url, fallbackDownloadUrl),
      uploaded_at: pickString(firstAttachment.uploaded_at, firstAttachment.created_at, fallbackUploadedAt),
    },
    ...restAttachments,
  ];
}

function normalizeReport(rawReport: Report, fallbackId: string): Report {
  const report = rawReport as ReportWithAliases;
  const normalizedId = pickValue(report.id, report.report_id, fallbackId);
  const attachments = normalizeAttachments(report);
  const attachmentCount = pickValue(report.attachment_count, report.attachmentCount, attachments?.length);

  return {
    ...rawReport,
    id: normalizedId as Report["id"],
    report_code: pickString(report.report_code, report.reportCode, normalizedId),
    title: pickString(report.title, report.subject),
    report_type: pickString(report.report_type, report.reportType, "GENERAL"),
    upload_purpose: pickString(report.upload_purpose, report.purpose, "ANALYSIS"),
    status: pickString(report.status, "SUBMITTED"),
    priority: pickString(report.priority, "NORMAL"),
    location: getReportLocationDraftValue(report),
    cctv_id: pickValue(report.cctv_id, report.cctvId) as Report["cctv_id"],
    risk_level: pickString(report.risk_level, report.riskLevel),
    created_at: pickString(report.created_at, report.createdAt, report.submitted_at),
    updated_at: pickString(report.updated_at, report.updatedAt),
    reporter_name: pickString(report.reporter_name, report.reporterName, report.reporter),
    reporter_id: pickValue(report.reporter_id, report.reporterId) as Report["reporter_id"],
    converted_incident_id: pickValue(report.converted_incident_id, report.convertedIncidentCode) as Report["converted_incident_id"],
    analysis_job_id: pickValue(report.analysis_job_id, report.analysisJobId) as Report["analysis_job_id"],
    analysis_status: pickString(report.analysis_status, report.analysisStatus, report.analysis_jobs?.[0]?.status, report.analysisJobs?.[0]?.status),
    analysis_summary: pickString(report.analysis_summary, report.analysisSummary, report.analysis_jobs?.[0]?.summary, report.analysisJobs?.[0]?.summary),
    analysis_jobs: report.analysis_jobs ?? report.analysisJobs,
    attachments,
    attachment_count: attachmentCount === undefined ? undefined : Number(attachmentCount),
    attachment_name: pickString(report.attachment_name, report.attachmentName, attachments?.[0]?.original_filename, attachments?.[0]?.filename),
    attachment_type: pickString(report.attachment_type, report.attachmentType, attachments?.[0]?.mime_type, attachments?.[0]?.file_type),
    uploaded_at: pickString(report.uploaded_at, report.uploadedAt, attachments?.[0]?.uploaded_at, attachments?.[0]?.created_at),
    preview_url: pickString(report.preview_url, report.previewUrl, report.thumbnail_url, report.thumbnailUrl, attachments?.[0]?.preview_url, attachments?.[0]?.file_url),
    thumbnail_url: pickString(report.thumbnail_url, report.thumbnailUrl),
    download_url: pickString(report.download_url, report.downloadUrl, attachments?.[0]?.download_url),
  };
}

function getReportId(report: Report) {
  return pickString(report.id) ?? "";
}

function getReportCode(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.reportCode, normalized.report_code, normalized.id) ?? "-";
}

function getReportTitle(report: Report) {
  return pickString(report.title, report.subject) ?? "제목 없음";
}

function getReportType(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.report_type, normalized.reportType) ?? "GENERAL";
}

function getUploadPurpose(report: Report) {
  return pickString(report.upload_purpose, report.purpose) ?? "ANALYSIS";
}

function getReportStatus(report: Report) {
  return pickString(report.status) ?? "SUBMITTED";
}

function getReportPriority(report: Report) {
  return pickString(report.priority) ?? "NORMAL";
}

function getReportLocation(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.location, normalized.address, normalized.place_name, normalized.locationName, normalized.placeName) ?? "-";
}

function getReportDescription(report: Report) {
  return pickString(report.description) ?? "";
}

function getReportCreatedAt(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.created_at, normalized.createdAt, normalized.submitted_at);
}

function getReportUpdatedAt(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.updated_at, normalized.updatedAt);
}

function getReportReporter(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.reporter_name, normalized.reporterName, normalized.reporter, normalized.reporter_id, normalized.reporterId) ?? "-";
}

function getReportCctvId(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.cctv_id, normalized.cctvId) ?? "-";
}

function getReportRiskLevel(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.risk_level, normalized.riskLevel) ?? "-";
}

function getConvertedIncident(report: Report) {
  return pickString(report.converted_incident_id, report.convertedIncidentCode);
}

function getAnalysisJobId(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.analysis_job_id, normalized.analysisJobId, normalized.analysis_jobs?.[0]?.analysis_job_id, normalized.analysis_jobs?.[0]?.id, normalized.analysisJobs?.[0]?.analysis_job_id, normalized.analysisJobs?.[0]?.id);
}

function getAnalysisStatus(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.analysis_status, normalized.analysisStatus, normalized.analysis_jobs?.[0]?.status, normalized.analysisJobs?.[0]?.status) ?? "WAITING";
}

function getAnalysisSummary(report: Report) {
  const normalized = report as ReportWithAliases;
  return pickString(normalized.analysis_summary, normalized.analysisSummary, normalized.analysis_jobs?.[0]?.summary, normalized.analysisJobs?.[0]?.summary) ?? "분석 결과가 아직 없습니다.";
}

function getBadgeTone(value: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (["REJECTED", "DELETED", "URGENT", "HIGH", "CRITICAL", "FAILED"].includes(value)) return "red";
  if (["ANALYZING", "QUEUED", "MEDIUM"].includes(value)) return "amber";
  if (["CONVERTED_TO_INCIDENT", "COMPLETED", "LOW"].includes(value)) return "green";
  if (["REVIEWING", "REQUESTED", "WAITING", "NORMAL"].includes(value)) return "blue";
  return "slate";
}

function formatDateTime(value: string | null | undefined) {
  const safeValue = pickString(value);
  if (!safeValue) return "-";
  const date = new Date(safeValue);
  if (Number.isNaN(date.getTime())) return safeValue;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const displayValue = pickString(value) ?? "-";

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-800">{displayValue}</dd>
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
      location: getReportLocationDraftValue(nextReport),
      latitude: getReportLatitudeValue(nextReport),
      longitude: getReportLongitudeValue(nextReport),
    });
    setIsEditing(true);
  }

  async function loadReport() {
    setLoading(true);
    setErrorMessage(null);
    setActionError(null);

    try {
      const nextReport = await getReport(id);
      const normalizedReport = normalizeReport(nextReport, id);
      setReport(normalizedReport);
      if (isEditing) beginEdit(normalizedReport);
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
        title: pickString(editDraft.title),
        subject: pickString(editDraft.subject, editDraft.title),
        description: pickString(editDraft.description),
        location: pickString(editDraft.location),
        latitude: editDraft.latitude === undefined || Number.isNaN(Number(editDraft.latitude)) ? undefined : Number(editDraft.latitude),
        longitude: editDraft.longitude === undefined || Number.isNaN(Number(editDraft.longitude)) ? undefined : Number(editDraft.longitude),
      };
      const nextReport = await updateReport(getReportId(report), payload);
      setReport(normalizeReport(nextReport, id));
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
  const analysisJobId = getAnalysisJobId(report);
  const convertedIncident = getConvertedIncident(report);

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
                  <InfoRow label="reporter" value={getReportReporter(report)} />
                  <InfoRow label="location" value={getReportLocation(report)} />
                  <InfoRow label="cctvId" value={getReportCctvId(report)} />
                  <InfoRow label="status" value={statusLabels[status] ?? status} />
                  <InfoRow label="priority" value={priorityLabels[priority] ?? priority} />
                  <InfoRow label="riskLevel" value={getReportRiskLevel(report)} />
                  <InfoRow label="createdAt" value={formatDateTime(getReportCreatedAt(report))} />
                  <InfoRow label="updatedAt" value={formatDateTime(getReportUpdatedAt(report))} />
                </dl>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 p-5"><h3 className="text-lg font-black text-slate-950">첨부파일</h3></div>
              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
                <ReportAttachmentPreview report={report} />
                <dl className="grid content-start gap-3">
                  <InfoRow label="첨부 개수" value={report.attachment_count ?? report.attachments?.length ?? 0} />
                  <InfoRow label="파일명" value={report.attachments?.[0]?.original_filename ?? report.attachments?.[0]?.filename ?? report.attachment_name ?? report.attachmentName} />
                  <InfoRow label="파일 유형" value={report.attachments?.[0]?.mime_type ?? report.attachments?.[0]?.file_type ?? report.attachment_type ?? report.attachmentType} />
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
              <dl className="mb-4 grid gap-3 md:grid-cols-2">
                <InfoRow label="analysisJobId" value={analysisJobId} />
                <InfoRow label="analysisStatus" value={analysisStatus} />
              </dl>
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
              {convertedIncident ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">이벤트로 전환됨</p>
                  <strong className="mt-1 block text-lg text-emerald-900">{convertedIncident}</strong>
                </div>
              ) : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">아직 이벤트로 전환되지 않음</p>}
            </Card>
          </aside>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
