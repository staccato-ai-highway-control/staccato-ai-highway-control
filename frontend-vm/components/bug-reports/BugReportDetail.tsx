"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Download, Pencil, Save, Upload, X, XCircle } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import {
  downloadBugReportAttachment,
  closeBugReport,
  downloadBugReportAttachmentUrl,
  fetchBugReport,
  updateBugReport,
  uploadBugReportAttachments,
} from "@/features/bug-reports/api";
import type { AuthUser } from "@/features/auth/types";
import type { BugReport, BugReportAttachment, BugReportUpdateRequest } from "@/features/bug-reports/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { isApiError } from "@/lib/apiClient";

const statusLabels: Record<string, string> = {
  OPEN: "열림",
  IN_PROGRESS: "처리중",
  RESOLVED: "해결",
  CLOSED: "닫힘",
};

function badgeTone(value?: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (!value) return "slate";
  if (["CRITICAL", "HIGH"].includes(value)) return "red";
  if (["MAJOR", "IN_PROGRESS", "MEDIUM"].includes(value)) return "amber";
  if (["RESOLVED", "CLOSED", "LOW"].includes(value)) return "green";
  if (["OPEN", "MINOR"].includes(value)) return "blue";
  return "slate";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getAttachmentName(attachment: BugReportAttachment) {
  return attachment.original_filename ?? attachment.filename ?? "첨부파일";
}

function getAttachmentType(attachment: BugReportAttachment) {
  return attachment.mime_type ?? attachment.file_type ?? "-";
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-800 [overflow-wrap:anywhere] [word-break:keep-all]">{value || "-"}</dd>
    </div>
  );
}

function createEditDraft(report: BugReport): BugReportUpdateRequest {
  return {
    title: report.title ?? "",
    description: report.description ?? "",
    category: report.category ?? "GENERAL",
    severity: report.severity ?? "MINOR",
    priority: report.priority ?? "MEDIUM",
    page_url: report.page_url ?? "",
  };
}

function cleanPayload(payload: BugReportUpdateRequest): BugReportUpdateRequest {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  ) as BugReportUpdateRequest;
}

export function BugReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<BugReport | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [editDraft, setEditDraft] = useState<BugReportUpdateRequest>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  async function loadReport() {
    setLoading(true);
    setErrorMessage("");
    setErrorStatus(null);

    try {
      const nextReport = await fetchBugReport(id);
      setReport(nextReport);
      if (isEditing) setEditDraft(createEditDraft(nextReport));
    } catch (error) {
      setReport(null);
      setErrorStatus(isApiError(error) ? error.statusCode : 500);
      setErrorMessage(error instanceof Error ? error.message : "버그리포트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
    loadReport();
  }, [id]);

  function beginEdit() {
    if (!report) return;
    setEditDraft(createEditDraft(report));
    setIsEditing(true);
    setActionMessage("");
  }

  async function handleUpdate() {
    if (!report) return;
    if (!String(editDraft.title ?? "").trim() || !String(editDraft.description ?? "").trim()) {
      setActionMessage("제목과 내용을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setActionMessage("");

    try {
      await updateBugReport(report.id, cleanPayload(editDraft));
      setActionMessage("버그리포트가 수정되었습니다.");
      setIsEditing(false);
      await loadReport();
    } catch {
      setActionMessage("버그리포트를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseReport() {
    if (!report) return;
    const confirmed = window.confirm("버그리포트를 닫으시겠습니까?");
    if (!confirmed) return;

    setClosing(true);
    setActionMessage("");

    try {
      await closeBugReport(report.id);
      setActionMessage("버그리포트가 닫혔습니다.");
      await loadReport();
    } catch {
      setActionMessage("버그리포트를 닫지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setClosing(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setActionMessage("");

    try {
      await uploadBugReportAttachments(id, Array.from(files));
      setActionMessage("첨부파일이 업로드되었습니다.");
      await loadReport();
    } catch {
      setActionMessage("첨부파일 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(attachment: BugReportAttachment) {
    setDownloadingId(String(attachment.id));
    setActionMessage("");

    try {
      const blob = attachment.download_url
        ? await downloadBugReportAttachmentUrl(attachment.download_url)
        : await downloadBugReportAttachment(attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getAttachmentName(attachment);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setActionMessage("첨부파일을 다운로드할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDownloadingId(null);
    }
  }

  const ownerId = report?.reporter_id ?? report?.author_id ?? report?.user_id;
  const isActiveUser = authUser?.account_status?.toUpperCase() === "ACTIVE";
  const isOwner = ownerId !== null && ownerId !== undefined && String(ownerId) === String(authUser?.id);
  const isSuperAdmin = authUser?.role === "SUPER_ADMIN";
  const allowedActions = report?.allowed_actions;
  const canUpdate = Boolean(isActiveUser && (allowedActions?.update ?? allowedActions?.edit ?? (isSuperAdmin || isOwner)));
  const canClose = Boolean(isActiveUser && (allowedActions?.close ?? allowedActions?.delete ?? (isSuperAdmin || isOwner)));
  const canUploadAttachment = Boolean(isActiveUser && (allowedActions?.upload_attachment ?? (isSuperAdmin || isOwner)));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">STACCATO</p>
            <h1 className="mt-3 text-3xl font-black">버그리포트 상세</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">등록된 오류나 개선 요청 내용을 확인합니다.</p>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            {report && (canUpdate || canClose) ? (
              <>
                {canUpdate ? <button type="button" onClick={beginEdit} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  수정
                </button> : null}
                {canClose ? <button type="button" onClick={handleCloseReport} disabled={closing || report.status === "CLOSED"} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  {closing ? "닫는 중" : "버그리포트 닫기"}
                </button> : null}
              </>
            ) : null}
            <Link href="/bug-reports" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 no-underline transition hover:bg-slate-50">
              목록으로
            </Link>
          </div>
        </header>

        {loading ? (
          <Card className="p-10 text-center text-sm font-bold text-slate-500">버그리포트 상세를 불러오는 중입니다.</Card>
        ) : null}

        {!loading && errorMessage ? (
          <Card className="p-10 text-center">
            <p className="text-3xl font-black text-red-700">{errorStatus ?? 500}</p>
            <p className="mt-3 text-sm font-bold text-red-700">{errorMessage}</p>
          </Card>
        ) : null}

        {!loading && !errorMessage && !report ? (
          <Card className="p-10 text-center text-sm font-black text-slate-500">버그리포트를 찾을 수 없습니다.</Card>
        ) : null}

        {!loading && !errorMessage && report ? (
          <div className="grid gap-5">
            {isEditing ? (
              <Card className="p-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">버그리포트 수정</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">수정 가능한 항목만 저장합니다.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={handleUpdate} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {saving ? "저장 중" : "저장"}
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                      <X className="h-4 w-4" aria-hidden="true" />
                      취소
                    </button>
                  </div>
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    제목
                    <input value={editDraft.title ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>

                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    내용
                    <textarea value={editDraft.description ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))} className="min-h-36 rounded-lg border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="grid gap-2 text-sm font-bold text-slate-700">
                      카테고리
                      <input value={editDraft.category ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, category: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-slate-700">
                      심각도
                      <select value={editDraft.severity ?? "MINOR"} onChange={(event) => setEditDraft((current) => ({ ...current, severity: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400">
                        {["MINOR", "MAJOR", "CRITICAL"].map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-slate-700">
                      우선순위
                      <select value={editDraft.priority ?? "MEDIUM"} onChange={(event) => setEditDraft((current) => ({ ...current, priority: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400">
                        {["LOW", "MEDIUM", "HIGH"].map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    페이지 URL
                    <input value={editDraft.page_url ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, page_url: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
                </div>
              </Card>
            ) : null}

            <Card className="p-6">
              <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-black text-slate-950">버그리포트 내용</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={badgeTone(report.status)}>{statusLabels[report.status ?? ""] ?? report.status ?? "OPEN"}</Badge>
                  <Badge tone={badgeTone(report.severity)}>{report.severity ?? "MINOR"}</Badge>
                  <Badge tone={badgeTone(report.priority)}>{report.priority ?? "MEDIUM"}</Badge>
                </div>
              </div>

              <dl className="grid gap-4">
                <DetailRow label="제목" value={report.title || "제목 없음"} />
                <DetailRow label="내용" value={report.description || "설명이 없습니다."} />
                <div className="grid gap-4 md:grid-cols-3">
                  <DetailRow label="카테고리" value={report.category ?? "GENERAL"} />
                  <DetailRow label="심각도" value={report.severity ?? "MINOR"} />
                  <DetailRow label="우선순위" value={report.priority ?? "MEDIUM"} />
                </div>
                <DetailRow label="페이지 URL" value={report.page_url} />
              </dl>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                <span>등록일 {formatDate(report.created_at)}</span>
                <span>수정일 {formatDate(report.updated_at)}</span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">첨부파일</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">스크린샷이나 참고 파일을 추가하고 다운로드합니다.</p>
                </div>
                {canUploadAttachment ? (
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {uploading ? "업로드 중" : "파일 추가"}
                    <input
                      type="file"
                      multiple
                      disabled={uploading}
                      onChange={(event) => {
                        handleUpload(event.target.files);
                        event.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                ) : null}
              </div>

              {actionMessage ? <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-700">{actionMessage}</p> : null}

              {(report.attachments ?? []).length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                  첨부파일이 없습니다.
                </div>
              ) : (
                <ul className="grid gap-3">
                  {(report.attachments ?? []).map((attachment) => (
                    <li key={attachment.id} className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="max-w-full truncate text-sm font-black text-slate-900">{getAttachmentName(attachment)}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {getAttachmentType(attachment)} · {formatDate(attachment.uploaded_at ?? attachment.created_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(attachment)}
                        disabled={downloadingId === String(attachment.id)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {downloadingId === String(attachment.id) ? "다운로드 중" : "다운로드"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        ) : null}
      </section>
    </main>
  );
}
