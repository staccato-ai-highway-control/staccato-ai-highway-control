"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle, Pencil, RotateCcw, Save, Sparkles, Trash2, X, XCircle } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorPage } from "@/components/common/ErrorPage";
import { ReportAttachmentPreview } from "@/components/report/ReportAttachmentPreview";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { approveReport, deleteReport, deleteReportAttachment, getReport, getReportAnalysisJobs, getReportAnalysisStatus, rejectReport, requestReportAnalysis, retryReportAnalysisJob, updateReport, updateReportStatus, uploadReportAttachments } from "@/features/reports/api";
import type { Report, ReportAnalysisJob, ReportAnalysisStatus, ReportAttachment, UpdateReportPayload } from "@/features/reports/types";

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
  CLOSED: "종료",
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
  return report.report_code ?? report.reportCode ?? String(report.id ?? "-");
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

function getAnalysisStatusValue(report: Report, status?: ReportAnalysisStatus | null) {
  return status?.analysis_status ?? status?.status ?? status?.latest_job?.job_status ?? status?.latest_job?.status ?? report.analysis_status ?? report.analysisStatus ?? "WAITING";
}

function getAnalysisSummaryValue(report: Report, status?: ReportAnalysisStatus | null) {
  return status?.analysis_summary ?? status?.summary ?? status?.latest_job?.summary ?? report.analysis_summary ?? report.analysisSummary ?? "분석 결과가 아직 없습니다.";
}

function isAnalysisRunning(status: string) {
  return ["QUEUED", "PROCESSING", "ANALYZING", "REQUESTED"].includes(status);
}

function isAnalysisTerminal(status: string) {
  return ["COMPLETED", "FAILED"].includes(status);
}

function getBadgeTone(value: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (["REJECTED", "DELETED", "URGENT", "HIGH", "CRITICAL", "FAILED"].includes(value)) return "red";
  if (["QUEUED", "PROCESSING", "ANALYZING", "MEDIUM"].includes(value)) return "amber";
  if (["CONVERTED_TO_INCIDENT", "COMPLETED", "LOW"].includes(value)) return "green";
  if (["REVIEWING", "REQUESTED", "WAITING", "NORMAL"].includes(value)) return "blue";
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

function getAttachmentId(attachment?: ReportAttachment) {
  return attachment?.attachment_id ?? attachment?.id;
}

function getAttachmentName(attachment?: ReportAttachment) {
  return attachment?.original_filename ?? attachment?.filename ?? "첨부파일";
}

function getAttachmentType(attachment?: ReportAttachment) {
  return attachment?.mime_type ?? attachment?.file_type ?? "-";
}

function getJobId(job: ReportAnalysisJob) {
  return job.analysis_job_id ?? job.id;
}

function getJobStatus(job: ReportAnalysisJob) {
  return job.job_status ?? job.status ?? "-";
}

function getRetryErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("409")) return "이미 진행 중인 분석 작업입니다.";
  if (message.includes("403") || message.includes("권한")) return "권한이 없습니다.";
  if (message.includes("404") || message.includes("찾을 수")) return "분석 대상 정보를 찾을 수 없습니다.";
  return "분석 작업 재시도에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}


function normalizeAnalysisJobs(value: unknown): ReportAnalysisJob[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const objectValue = value as {
      analysisJobs?: unknown;
      jobs?: unknown;
      data?: unknown;
      items?: unknown;
      results?: unknown;
    };

    const candidates = [
      objectValue.analysisJobs,
      objectValue.jobs,
      objectValue.data,
      objectValue.items,
      objectValue.results,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as ReportAnalysisJob[];
      }
    }
  }

  return [];
}


function formatReportDisplayValue(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? `${value.length}개` : fallback;
  }

  if (typeof value === "object") {
    const objectValue = value as {
      status?: unknown;
      count?: unknown;
      frames_processed?: unknown;
      filename?: unknown;
      message?: unknown;
      summary?: unknown;
    };

    const summary = objectValue.summary ?? objectValue.message;
    if (summary) {
      return formatReportDisplayValue(summary, fallback);
    }

    const parts: string[] = [];

    if (objectValue.status) {
      parts.push(`상태 ${formatReportDisplayValue(objectValue.status, "")}`);
    }

    if (objectValue.count !== undefined) {
      parts.push(`감지 ${formatReportDisplayValue(objectValue.count, "0")}건`);
    }

    if (objectValue.frames_processed !== undefined) {
      parts.push(`처리 프레임 ${formatReportDisplayValue(objectValue.frames_processed, "0")}`);
    }

    if (objectValue.filename) {
      parts.push(`파일 ${formatReportDisplayValue(objectValue.filename, "")}`);
    }

    return parts.length > 0 ? parts.join(" · ") : JSON.stringify(value);
  }

  return fallback;
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
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [analysisStatusResult, setAnalysisStatusResult] = useState<ReportAnalysisStatus | null>(null);
  const [analysisJobs, setAnalysisJobs] = useState<ReportAnalysisJob[]>([]);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [pollingAnalysis, setPollingAnalysis] = useState(false);
  const [updatingOperation, setUpdatingOperation] = useState(false);
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
      setAnalysisStatusResult(null);
      try {
        setAnalysisJobs(normalizeAnalysisJobs(await getReportAnalysisJobs(getReportId(nextReport))));
      } catch {
        setAnalysisJobs([]);
      }
      if (isEditing) beginEdit(nextReport);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "신고 상세를 불러오지 못했습니다.");
      setReport(null);
      setAnalysisJobs([]);
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
      const reportId = getReportId(report);
      const response = await requestReportAnalysis(reportId);
      const jobs = normalizeAnalysisJobs(response.jobs ?? response.data?.jobs ?? response);
      const requestedJobId = response.job_id ?? response.data?.job_id ?? jobs[0]?.analysis_job_id ?? jobs[0]?.id;
      const latestJob = jobs[0] ? { ...jobs[0], job_status: jobs[0].job_status ?? jobs[0].status ?? "QUEUED" } : null;

      setAnalysisStatusResult({
        report_id: reportId,
        analysis_job_id: requestedJobId,
        analysis_status: latestJob?.job_status ?? "QUEUED",
        latest_job: latestJob,
      });

      try {
        const nextJobs = normalizeAnalysisJobs(await getReportAnalysisJobs(reportId));
        setAnalysisJobs(nextJobs.length > 0 ? nextJobs : jobs);
      } catch {
        setAnalysisJobs(jobs);
      }
    } catch {
      setActionError("분석 요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setRequestingAnalysis(false);
    }
  }

  useEffect(() => {
    if (!report) return;

    const currentReport = report;
    const reportId = getReportId(currentReport);
    const currentStatus = getAnalysisStatusValue(currentReport, analysisStatusResult);
    if (!isAnalysisRunning(currentStatus)) {
      setPollingAnalysis(false);
      return;
    }

    let disposed = false;
    let timer: number | undefined;

    async function pollAnalysisStatus() {
      try {
        const nextStatus = await getReportAnalysisStatus(reportId);
        if (disposed) return;
        setAnalysisStatusResult(nextStatus);

        const statusValue = getAnalysisStatusValue(currentReport, nextStatus);
        if (isAnalysisTerminal(statusValue)) {
          setPollingAnalysis(false);
          await loadReport();
          return;
        }

        timer = window.setTimeout(pollAnalysisStatus, 3000);
      } catch (error) {
        if (!disposed) {
          setPollingAnalysis(false);
          setActionError("분석 상태를 불러오지 못했습니다.");
        }
      }
    }

    setPollingAnalysis(true);
    timer = window.setTimeout(pollAnalysisStatus, 3000);

    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [report?.id, report?.analysis_status, analysisStatusResult?.analysis_status, analysisStatusResult?.status]);

  async function handleRetryAnalysisJob(job: ReportAnalysisJob) {
    if (!report) return;
    const jobId = getJobId(job);
    if (!jobId || getJobStatus(job) !== "FAILED") return;

    const confirmed = window.confirm("실패한 분석 작업을 재시도하시겠습니까?");
    if (!confirmed) return;

    setRetryingJobId(String(jobId));
    setActionError(null);

    try {
      const retriedJob = await retryReportAnalysisJob(jobId);
      const [nextStatus, nextJobs] = await Promise.all([
        getReportAnalysisStatus(getReportId(report)),
        getReportAnalysisJobs(getReportId(report)),
      ]);
      setAnalysisStatusResult(nextStatus);
      setAnalysisJobs(normalizeAnalysisJobs(nextJobs));

      const retriedStatus = getJobStatus(retriedJob);
      if (!isAnalysisRunning(retriedStatus)) await loadReport();
    } catch (error) {
      setActionError(getRetryErrorMessage(error));
      try {
        setAnalysisJobs(normalizeAnalysisJobs(await getReportAnalysisJobs(getReportId(report))));
      } catch {
        setAnalysisJobs([]);
      }
    } finally {
      setRetryingJobId(null);
    }
  }

  async function handleChangeStatus(nextStatus: string, reason: string) {
    if (!report) return;
    setUpdatingOperation(true);
    setActionError(null);

    try {
      await updateReportStatus(getReportId(report), { status: nextStatus, reason });
      await loadReport();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "신고 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingOperation(false);
    }
  }

  async function handleApprove() {
    if (!report) return;
    const memo = window.prompt("승인 메모를 입력해 주세요.", "신고 내용 확인 완료");
    if (memo === null) return;

    setUpdatingOperation(true);
    setActionError(null);
    try {
      await approveReport(getReportId(report), memo);
      await loadReport();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "신고 승인에 실패했습니다.");
    } finally {
      setUpdatingOperation(false);
    }
  }

  async function handleReject() {
    if (!report) return;
    const reason = window.prompt("반려 사유를 입력해 주세요.", "");
    if (reason === null) return;
    if (!reason.trim()) {
      setActionError("반려 사유를 입력해 주세요.");
      return;
    }

    setUpdatingOperation(true);
    setActionError(null);
    try {
      await rejectReport(getReportId(report), reason.trim());
      await loadReport();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "신고 반려에 실패했습니다.");
    } finally {
      setUpdatingOperation(false);
    }
  }

  async function handleUploadAttachments(files: FileList | null) {
    if (!report || !files || files.length === 0) return;
    setUploadingAttachment(true);
    setActionError(null);

    try {
      await uploadReportAttachments(getReportId(report), Array.from(files));
      await loadReport();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "첨부파일 추가에 실패했습니다.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleDeleteAttachment(attachment: ReportAttachment) {
    if (!report) return;
    const attachmentId = getAttachmentId(attachment);
    if (!attachmentId) {
      setActionError("삭제할 첨부파일 ID가 없습니다.");
      return;
    }

    const confirmed = window.confirm(`${getAttachmentName(attachment)} 파일을 삭제하시겠습니까?`);
    if (!confirmed) return;

    const reason = window.prompt("삭제 사유를 입력해 주세요. 비워두면 사유 없이 삭제됩니다.", "");
    if (reason === null) return;

    setDeletingAttachmentId(String(attachmentId));
    setActionError(null);

    try {
      await deleteReportAttachment(getReportId(report), attachmentId, reason.trim() || undefined);
      await loadReport();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "첨부파일 삭제에 실패했습니다.");
    } finally {
      setDeletingAttachmentId(null);
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
  const analysisStatus = getAnalysisStatusValue(report, analysisStatusResult);
  const analysisSummary = getAnalysisSummaryValue(report, analysisStatusResult);
  const riskLevel = analysisStatusResult?.risk_level ?? analysisStatusResult?.latest_job?.risk_level ?? report.risk_level;
  const riskScore = analysisStatusResult?.risk_score ?? analysisStatusResult?.latest_job?.risk_score ?? report.risk_score;
  const convertedIncidentId = analysisStatusResult?.converted_incident_id ?? analysisStatusResult?.latest_job?.converted_incident_id ?? report.converted_incident_id ?? report.convertedIncidentCode;

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
                  <button type="button" onClick={handleApprove} disabled={updatingOperation} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    승인
                  </button>
                  <button type="button" onClick={handleReject} disabled={updatingOperation} className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    반려
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
                  <InfoRow label="riskLevel" value={riskLevel} />
                  <InfoRow label="riskScore" value={riskScore} />
                  <InfoRow label="createdAt" value={formatDateTime(getReportCreatedAt(report))} />
                  <InfoRow label="updatedAt" value={formatDateTime(report.updated_at)} />
                </dl>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 p-5"><h3 className="text-lg font-black text-slate-950">첨부파일</h3></div>
              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
                <ReportAttachmentPreview report={report} />
                <div className="grid content-start gap-3">
                  <InfoRow label="첨부 개수" value={report.attachment_count ?? report.attachments?.length ?? 0} />
                  <InfoRow label="파일명" value={report.attachments?.[0]?.original_filename ?? report.attachments?.[0]?.filename ?? report.attachment_name ?? report.attachmentName} />
                  <InfoRow label="파일 유형" value={report.attachments?.[0]?.mime_type ?? report.attachments?.[0]?.file_type ?? report.attachment_type ?? report.attachmentType} />
                  <InfoRow label="업로드 시간" value={formatDateTime(report.uploaded_at ?? report.uploadedAt)} />
                  <label className="grid gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                    첨부파일 추가
                    <input
                      type="file"
                      multiple
                      disabled={uploadingAttachment}
                      onChange={(event) => {
                        handleUploadAttachments(event.target.files);
                        event.target.value = "";
                      }}
                      className="text-xs font-semibold text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white disabled:opacity-50"
                    />
                    {uploadingAttachment ? <span className="text-xs font-semibold text-slate-500">업로드 중입니다.</span> : null}
                  </label>
                  {(report.attachments ?? []).length > 0 ? (
                    <div className="grid gap-2">
                      {(report.attachments ?? []).map((attachment, index) => {
                        const attachmentId = getAttachmentId(attachment);
                        return (
                          <div key={attachmentId ?? `${getAttachmentName(attachment)}-${index}`} className="rounded-lg border border-slate-100 bg-white p-3">
                            <p className="truncate text-xs font-black text-slate-800">{getAttachmentName(attachment)}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">{getAttachmentType(attachment)}</p>
                            <button
                              type="button"
                              disabled={!attachmentId || deletingAttachmentId === String(attachmentId)}
                              onClick={() => handleDeleteAttachment(attachment)}
                              className="mt-3 h-8 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingAttachmentId === String(attachmentId) ? "삭제 중" : "삭제"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">AI 분석</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{formatReportDisplayValue(analysisSummary, "분석 결과가 아직 없습니다.")}</p>
                  {pollingAnalysis ? <p className="mt-2 text-xs font-bold text-amber-600">3초 간격으로 분석 상태를 확인 중입니다.</p> : null}
                </div>
                <Badge tone={getBadgeTone(analysisStatus)}>{analysisStatus}</Badge>
              </div>
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <InfoRow label="analysisStatus" value={analysisStatus} />
                <InfoRow label="riskLevel" value={riskLevel} />
                <InfoRow label="riskScore" value={riskScore} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleRequestAnalysis} disabled={requestingAnalysis || isAnalysisRunning(analysisStatus)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {requestingAnalysis ? "요청 중" : "분석 요청"}
                </button>
                <Link href={`/reports/analysis-comparisons?report_id=${getReportId(report)}`} className="inline-flex h-10 items-center rounded-lg border border-sky-200 px-4 text-sm font-bold text-sky-700 no-underline transition hover:bg-sky-50">
                  비교분석
                </Link>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="text-sm font-black text-slate-800">분석 작업 목록</h4>
                {analysisJobs.length === 0 ? (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-500">분석 작업 내역이 없습니다.</p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {analysisJobs.map((job, index) => {
                      const jobId = getJobId(job);
                      const jobStatus = getJobStatus(job);
                      const canRetry = jobStatus === "FAILED" && Boolean(jobId);

                      return (
                        <div key={jobId ?? `analysis-job-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-black text-slate-800">Job {jobId ?? "-"}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">재시도 {job.retry_count ?? 0}회 · {formatDateTime(job.updated_at ?? job.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={getBadgeTone(jobStatus)}>{jobStatus}</Badge>
                              {canRetry ? (
                                <button
                                  type="button"
                                  disabled={retryingJobId === String(jobId)}
                                  onClick={() => handleRetryAnalysisJob(job)}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                  {retryingJobId === String(jobId) ? "재시도 중" : "재시도"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                          {job.summary ? <p className="mt-2 text-xs font-semibold text-slate-600">{formatReportDisplayValue(job.summary, "")}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
              <h3 className="text-lg font-black text-slate-950">운영 상태 변경</h3>
              <div className="mt-4 grid gap-2">
                {["SUBMITTED", "REVIEWING", "ANALYZING", "CONVERTED_TO_INCIDENT", "REJECTED", "CLOSED"].map((nextStatus) => (
                  <button key={nextStatus} type="button" disabled={updatingOperation || status === nextStatus} onClick={() => handleChangeStatus(nextStatus, `상태를 ${nextStatus}로 변경`)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                    {statusLabels[nextStatus] ?? nextStatus}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-black text-slate-950">이벤트 전환 결과</h3>
              {convertedIncidentId ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">이벤트로 전환됨</p>
                  <strong className="mt-1 block text-lg text-emerald-900">{convertedIncidentId}</strong>
                </div>
              ) : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">아직 이벤트로 전환되지 않음</p>}
            </Card>
          </aside>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
