"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Download, FileWarning, ShieldCheck } from "lucide-react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { downloadResourceFile, getResource, getResourceDownloadBlob } from "@/features/resources/api";
import type { ResourceItem } from "@/features/resources/types";
import { isApiError } from "@/lib/apiClient";

const PREVIEW_UNAVAILABLE = "이 파일 형식은 화면 미리보기를 지원하지 않습니다. 다운로드로 확인하세요.";
const PREVIEW_FAILED = "보안 로그 본문 미리보기를 불러오지 못했습니다.";
const EMPTY_PREVIEW = "로그 파일 내용이 비어 있습니다.";

const visibilityLabels: Record<ResourceItem["visibility"], string> = {
  ADMIN_ALL: "전체 관리자",
  SUPER_ADMIN_ONLY: "최고관리자만",
  OWNER_ONLY: "본인만",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function supportsTextPreview(
  category?: ResourceItem["category"] | null,
  fileType?: string | null,
  fileName?: string | null
) {
  if (String(category ?? "").trim().toUpperCase() === "ACCESS_LOG") return true;
  const type = String(fileType ?? "").trim().toLowerCase().split(";", 1)[0].replace(/^\./, "");
  const name = String(fileName ?? "").trim().toLowerCase();
  return ["txt", "log", "md", "text/plain", "text/markdown", "text/x-log"].includes(type) || /\.(txt|log|md)$/.test(name);
}

function getErrorStatus(reason: unknown) {
  return isApiError(reason) ? reason.statusCode : null;
}

function diagnosticValue(value: unknown) {
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

function MetadataItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 ${wide ? "sm:col-span-2" : ""}`}><dt className="text-xs font-black text-slate-400">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-800">{value || "-"}</dd></div>;
}

export default function SecurityLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [resource, setResource] = useState<ResourceItem | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailFailed, setDetailFailed] = useState(false);
  const [detailStatus, setDetailStatus] = useState<number | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [previewable, setPreviewable] = useState(false);
  const [blobType, setBlobType] = useState<string | null>(null);
  const [blobSize, setBlobSize] = useState<number | null>(null);
  const [textLength, setTextLength] = useState<number | null>(null);
  const [previewFailureMessage, setPreviewFailureMessage] = useState("");

  useEffect(() => {
    let disposed = false;

    async function loadDetail() {
      setLoading(true);
      setResource(null);
      setPreview("");
      setDetailFailed(false);
      setDetailStatus(null);
      setPreviewFailed(false);
      setPreviewStatus(null);
      setPreviewable(false);
      setBlobType(null);
      setBlobSize(null);
      setTextLength(null);
      setPreviewFailureMessage("");
      setDownloadError("");
      let nextResource: ResourceItem;
      try {
        nextResource = await getResource(id);
      } catch (error) {
        if (!disposed) {
          setDetailFailed(true);
          setDetailStatus(getErrorStatus(error));
          setLoading(false);
        }
        return;
      }

      if (disposed) return;
      setResource(nextResource);
      const canPreview = supportsTextPreview(
        nextResource.category,
        nextResource.file_type,
        nextResource.file_name
      );
      setPreviewable(canPreview);

      if (!canPreview) {
        if (process.env.NODE_ENV === "development") {
          console.log("[security-log-preview]", {
            id: nextResource.id,
            category: nextResource.category,
            file_name: nextResource.file_name,
            file_type: nextResource.file_type,
            previewable: canPreview,
            blob_type: null,
            blob_size: null,
          });
        }
        setPreview(PREVIEW_UNAVAILABLE);
        setLoading(false);
        return;
      }
      if (nextResource.allowed_actions?.download !== true) {
        setPreviewFailed(true);
        setPreviewStatus(403);
        setPreviewFailureMessage("이 보안 로그 파일을 다운로드하거나 미리보기할 권한이 없습니다.");
        setLoading(false);
        return;
      }


      try {
        const blob = await getResourceDownloadBlob(id);
        const isBlob = typeof Blob !== "undefined" && blob instanceof Blob;
        setBlobType(isBlob ? blob.type : null);
        setBlobSize(isBlob ? blob.size : null);
        if (process.env.NODE_ENV === "development") {
          console.log("[security-log-preview]", {
            id: nextResource.id,
            category: nextResource.category,
            file_name: nextResource.file_name,
            file_type: nextResource.file_type,
            previewable: canPreview,
            blob_type: isBlob ? blob.type : null,
            blob_size: isBlob ? blob.size : null,
          });
        }
        if (!isBlob) throw new Error("다운로드 응답이 Blob 형식이 아닙니다.");
        const text = await blob.text();
        setTextLength(text.length);
        if (process.env.NODE_ENV === "development") {
          console.log("[security-log-preview:text]", text.slice(0, 200));
        }
        setPreview(blob.size === 0 || text.length === 0 ? EMPTY_PREVIEW : text);
      } catch (error) {
        if (!disposed) {
          setPreviewFailed(true);
          setPreviewStatus(getErrorStatus(error));
          setPreviewFailureMessage(
            isApiError(error) ? "" : error instanceof Error ? error.message : PREVIEW_FAILED
          );
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    void loadDetail();
    return () => { disposed = true; };
  }, [id]);

  async function handleDownload() {
    if (!resource?.file_name || resource.allowed_actions?.download !== true) return;
    setDownloadError("");
    const fileName = String(resource.category).toUpperCase() === "ACCESS_LOG" && !/\.[^\/]+$/.test(resource.file_name)
      ? `${resource.file_name}.txt`
      : resource.file_name;
    try { await downloadResourceFile(resource.id, fileName); }
    catch { setDownloadError("파일을 다운로드하지 못했습니다."); }
  }

  const detailErrorMessage = detailStatus === 401
    ? "로그인이 필요합니다. 다시 로그인해 주세요."
    : detailStatus === 403
      ? "보안 로그를 확인할 권한이 없습니다."
      : detailStatus === 404
        ? "요청한 보안 로그를 찾을 수 없습니다."
        : "보안 로그 상세 내용을 불러오지 못했습니다.";
  const previewErrorMessage = previewFailureMessage || (previewStatus === 401
    ? "로그인이 필요하여 보안 로그 본문을 불러오지 못했습니다."
    : previewStatus === 403
      ? "보안 로그 본문을 확인할 권한이 없습니다."
      : previewStatus === 404
        ? "보안 로그 파일을 찾을 수 없습니다."
        : PREVIEW_FAILED);

  return (
    <RequireSuperAdmin title="보안 로그 상세">
      <AppLayout title="보안 로그 상세">
        <main className="mx-auto w-full max-w-6xl px-6 py-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-700"><ShieldCheck className="h-4 w-4" />관리자 전용 보안 로그</div><h1 className="text-2xl font-black text-slate-950">{resource?.title ?? "보안 로그 상세"}</h1><p className="mt-2 text-sm font-semibold text-slate-500">보안 로그의 메타데이터와 원본 파일 내용을 확인합니다.</p></div>
            <Link href="/security-logs" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 no-underline hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />목록으로</Link>

          </div>
          {process.env.NODE_ENV === "development" ? (
            <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base font-black text-amber-950">개발용 미리보기 진단</h2>
                <p className="mt-1 text-xs font-semibold text-amber-700">개발 환경에서만 표시됩니다.</p>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["id", id],
                  ["resource.category", resource?.category],
                  ["resource.file_name", resource?.file_name],
                  ["resource.file_type", resource?.file_type],
                  ["resource.allowed_actions.view", resource?.allowed_actions?.view],
                  ["resource.allowed_actions.download", resource?.allowed_actions?.download],
                  ["previewable", previewable],
                  ["previewStatus", previewStatus],
                  ["previewFailed", previewFailed],
                  ["preview.length", preview.length],
                  ["blob type", blobType],
                  ["blob size", blobSize],
                  ["text length", textLength],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                    <dt className="text-[11px] font-black text-amber-700">{label}</dt>
                    <dd className="mt-1 break-all font-mono text-xs font-bold text-slate-800">{diagnosticValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}


          {loading ? <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-500 shadow-sm">보안 로그 내용을 불러오는 중입니다.</div> : null}

          {!loading && detailFailed ? <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-white px-6 text-center shadow-sm"><FileWarning className="h-10 w-10 text-red-500" /><p className="text-base font-black text-slate-950">{detailErrorMessage}</p>{detailStatus ? <p className="text-sm font-semibold text-slate-500">오류 코드 {detailStatus}</p> : null}</div> : null}

          {!loading && resource ? <div className="grid gap-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-black text-slate-950">메타데이터</h2>{resource.file_name && resource.allowed_actions?.download === true ? <button type="button" onClick={() => void handleDownload()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-black text-white hover:bg-sky-700"><Download className="h-4 w-4" />다운로드</button> : null}</div>{downloadError ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{downloadError}</p> : null}<dl className="grid gap-3 sm:grid-cols-2"><MetadataItem label="제목" value={resource.title} /><MetadataItem label="설명" value={resource.description || "-"} wide /><MetadataItem label="파일명" value={resource.file_name || "-"} /><MetadataItem label="파일 형식" value={resource.file_type || "-"} /><MetadataItem label="파일 크기" value={formatFileSize(resource.file_size)} /><MetadataItem label="작성자" value={resource.author_name || "-"} /><MetadataItem label="공개 범위" value={visibilityLabels[resource.visibility] ?? resource.visibility} /><MetadataItem label="생성일" value={formatDate(resource.created_at)} /><MetadataItem label="수정일" value={formatDate(resource.updated_at)} /></dl></section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-lg font-black text-slate-950">로그 본문</h2>{previewFailed ? <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-red-100 bg-red-50 px-6 text-center text-sm font-black text-red-700">{previewErrorMessage}</div> : <pre className="max-h-[65vh] min-h-[280px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-5 font-mono text-xs leading-6 text-slate-100">{preview}</pre>}</section>
          </div> : null}
        </main>
      </AppLayout>
    </RequireSuperAdmin>
  );
}
