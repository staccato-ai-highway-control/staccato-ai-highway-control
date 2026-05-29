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
import type { BugReport, BugReportAttachment, BugReportUpdateRequest } from "@/features/bug-reports/types";

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
    status: report.status ?? "OPEN",
    page_url: report.page_url ?? "",
    steps_to_reproduce: report.steps_to_reproduce ?? "",
    expected_result: report.expected_result ?? "",
    actual_result: report.actual_result ?? "",
    browser: report.browser ?? "",
    os: report.os ?? "",
    device: report.device ?? "",
    app_version: report.app_version ?? "MVP",
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
  const [editDraft, setEditDraft] = useState<BugReportUpdateRequest>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  async function loadReport() {
    setLoading(true);
    setErrorMessage("");

    try {
      const nextReport = await fetchBugReport(id);
      setReport(nextReport);
      if (isEditing) setEditDraft(createEditDraft(nextReport));
    } catch {
      setReport(null);
      setErrorMessage("버그 리포트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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
      setActionMessage("버그 리포트가 수정되었습니다.");
      setIsEditing(false);
      await loadReport();
    } catch {
      setActionMessage("버그 리포트를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseReport() {
    if (!report) return;
    const confirmed = window.confirm("버그 리포트를 닫으시겠습니까?");
    if (!confirmed) return;

    setClosing(true);
    setActionMessage("");

    try {
      await closeBugReport(report.id);
      setActionMessage("버그 리포트가 닫혔습니다.");
      await loadReport();
    } catch {
      setActionMessage("버그 리포트를 닫지 못했습니다. 잠시 후 다시 시도해 주세요.");
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">STACCATO</p>
            <h1 className="mt-3 text-3xl font-black">문의 상세</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">등록된 오류나 개선 요청 내용을 확인합니다.</p>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            {report ? (
              <>
                <button type="button" onClick={beginEdit} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  수정
                </button>
                <button type="button" onClick={handleCloseReport} disabled={closing || report.status === "CLOSED"} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  {closing ? "닫는 중" : "버그 리포트 닫기"}
                </button>
              </>
            ) : null}
            <Link href="/bug-reports" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 no-underline transition hover:bg-slate-50">
              목록으로
            </Link>
          </div>
        </header>

        {loading ? (
          <Card className="p-10 text-center text-sm font-bold text-slate-500">문의 상세를 불러오는 중입니다.</Card>
        ) : null}

        {!loading && errorMessage ? (
          <Card className="p-10 text-center">
            <p className="text-sm font-bold text-red-700">{errorMessage}</p>
          </Card>
        ) : null}

        {!loading && !errorMessage && !report ? (
          <Card className="p-10 text-center text-sm font-black text-slate-500">버그 리포트를 찾을 수 없습니다.</Card>
        ) : null}

        {!loading && !errorMessage && report ? (
          <div className="grid gap-5">
            {isEditing ? (
              <Card className="p-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">문의 수정</h2>
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

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    제목
                    <input value={editDraft.title ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
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
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    상태
                    <select value={editDraft.status ?? "OPEN"} onChange={(event) => setEditDraft((current) => ({ ...current, status: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400">
                      {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((value) => <option key={value} value={value}>{statusLabels[value] ?? value}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    페이지 URL
                    <input value={editDraft.page_url ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, page_url: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
                    내용
                    <textarea value={editDraft.description ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))} className="min-h-24 rounded-lg border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
                    재현 단계
                    <textarea value={editDraft.steps_to_reproduce ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, steps_to_reproduce: event.target.value }))} className="min-h-20 rounded-lg border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    기대 결과
                    <textarea value={editDraft.expected_result ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, expected_result: event.target.value }))} className="min-h-20 rounded-lg border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    실제 결과
                    <textarea value={editDraft.actual_result ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, actual_result: event.target.value }))} className="min-h-20 rounded-lg border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    브라우저
                    <input value={editDraft.browser ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, browser: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    OS
                    <input value={editDraft.os ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, os: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    디바이스
                    <input value={editDraft.device ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, device: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    앱 버전
                    <input value={editDraft.app_version ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, app_version: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" />
                  </label>
                </div>
              </Card>
            ) : null}

            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 p-6">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge tone={badgeTone(report.status)}>{statusLabels[report.status ?? ""] ?? report.status ?? "OPEN"}</Badge>
                  <Badge tone={badgeTone(report.severity)}>{report.severity ?? "MINOR"}</Badge>
                  <Badge tone={badgeTone(report.priority)}>{report.priority ?? "MEDIUM"}</Badge>
                </div>
                <h2 className="text-2xl font-black text-slate-950">{report.title || "제목 없음"}</h2>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-600 [overflow-wrap:anywhere] [word-break:keep-all]">{report.description || "설명이 없습니다."}</p>
              </div>

              <dl className="grid gap-3 p-6 md:grid-cols-2">
                <DetailRow label="category" value={report.category} />
                <DetailRow label="pageUrl" value={report.page_url} />
                <DetailRow label="browser" value={report.browser} />
                <DetailRow label="os" value={report.os} />
                <DetailRow label="device" value={report.device} />
                <DetailRow label="appVersion" value={report.app_version} />
                <DetailRow label="createdAt" value={formatDate(report.created_at)} />
                <DetailRow label="updatedAt" value={formatDate(report.updated_at)} />
                <div className="md:col-span-2">
                  <DetailRow label="stepsToReproduce" value={report.steps_to_reproduce} />
                </div>
                <div className="md:col-span-2">
                  <DetailRow label="expectedResult" value={report.expected_result} />
                </div>
                <div className="md:col-span-2">
                  <DetailRow label="actualResult" value={report.actual_result} />
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">첨부파일</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">스크린샷이나 참고 파일을 추가하고 다운로드합니다.</p>
                </div>
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
