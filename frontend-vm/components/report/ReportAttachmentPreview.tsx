"use client";

import { FileVideo } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { downloadReportAttachment, downloadReportAttachmentUrl, previewReportAttachment, previewReportAttachmentUrl } from "@/features/reports/api";
import type { Report, ReportAttachment } from "@/features/reports/types";

type ReportAttachmentPreviewProps = {
  report: Report;
  compact?: boolean;
};

function getAttachmentId(attachment?: ReportAttachment, report?: Report) {
  return attachment?.attachment_id ?? attachment?.id ?? report?.attachment_id;
}

function getAttachmentName(attachment?: ReportAttachment, report?: Report) {
  return attachment?.original_filename ?? attachment?.filename ?? report?.attachment_name ?? report?.attachmentName ?? "첨부파일";
}

function getAttachmentType(attachment?: ReportAttachment, report?: Report) {
  return attachment?.mime_type ?? attachment?.file_type ?? report?.attachment_type ?? report?.attachmentType ?? "";
}

function getPreviewUrl(report: Report, attachment?: ReportAttachment) {
  return attachment?.preview_url ?? attachment?.file_url ?? report.preview_url ?? report.thumbnail_url ?? undefined;
}

function getDownloadUrl(report: Report, attachment?: ReportAttachment) {
  return attachment?.download_url ?? report.download_url ?? undefined;
}

function isImageType(type: string) {
  return type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].some((ext) => type.toLowerCase().includes(ext));
}

export function ReportAttachmentPreview({ report, compact = false }: ReportAttachmentPreviewProps) {
  const attachments = report.attachments ?? [];
  const firstAttachment = attachments[0];
  const attachmentId = getAttachmentId(firstAttachment, report);
  const previewUrl = getPreviewUrl(report, firstAttachment);
  const downloadUrl = getDownloadUrl(report, firstAttachment);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [blobType, setBlobType] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const attachmentType = getAttachmentType(firstAttachment, report) || blobType;
  const hasAttachment = Boolean(attachmentId || previewUrl || downloadUrl || (report.attachment_count ?? 0) > 0);

  useEffect(() => {
    let disposed = false;
    let nextObjectUrl: string | null = null;

    async function loadPreview() {
      setErrorMessage("");
      setObjectUrl(null);
      setBlobType("");

      if (!attachmentId && !previewUrl) {
        if (hasAttachment) setErrorMessage("미리보기 URL이 없습니다.");
        return;
      }

      try {
        const blob = attachmentId ? await previewReportAttachment(attachmentId) : await previewReportAttachmentUrl(previewUrl as string);
        if (disposed) return;
        nextObjectUrl = URL.createObjectURL(blob);
        setBlobType(blob.type);
        setObjectUrl(nextObjectUrl);
      } catch (error) {
        if (!disposed) setErrorMessage(error instanceof Error ? error.message : "첨부파일 미리보기를 불러오지 못했습니다.");
      }
    }

    loadPreview();

    return () => {
      disposed = true;
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [attachmentId, hasAttachment, previewUrl]);

  const countLabel = useMemo(() => {
    const count = report.attachment_count ?? attachments.length;
    return count > 0 ? `첨부 ${count}개` : "첨부 없음";
  }, [attachments.length, report.attachment_count]);

  async function handleDownload() {
    if (!attachmentId && !downloadUrl && !previewUrl) return;

    try {
      const blob = attachmentId ? await downloadReportAttachment(attachmentId) : await downloadReportAttachmentUrl((downloadUrl ?? previewUrl) as string);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getAttachmentName(firstAttachment, report);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "첨부파일 다운로드에 실패했습니다.");
    }
  }

  if (compact) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
        <span className="rounded bg-slate-100 px-2 py-1">{countLabel}</span>
        {objectUrl ? <span className="text-sky-700">미리보기 가능</span> : null}
      </div>
    );
  }

  if (!hasAttachment) {
    return (
      <div className="grid min-h-80 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <div className="text-center">
          <FileVideo className="mx-auto h-12 w-12" aria-hidden="true" />
          <p className="mt-3 text-sm font-black">첨부파일 없음</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid min-h-80 place-items-center overflow-hidden rounded-lg bg-slate-950 text-white">
        {objectUrl && isImageType(attachmentType) ? (
          <img src={objectUrl} alt={getAttachmentName(firstAttachment, report)} className="h-full max-h-[520px] w-full object-contain" />
        ) : objectUrl ? (
          <video src={objectUrl} controls className="h-full max-h-[520px] w-full bg-black object-contain" />
        ) : (
          <div className="text-center">
            <FileVideo className="mx-auto h-12 w-12" aria-hidden="true" />
            <p className="mt-3 text-sm font-black">첨부파일 미리보기</p>
            <p className="mt-1 text-xs font-semibold text-white/70">{errorMessage || "미리보기를 불러오는 중입니다."}</p>
          </div>
        )}
      </div>
      {attachmentId || downloadUrl || previewUrl ? <button type="button" onClick={handleDownload} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">다운로드</button> : null}
      {errorMessage && objectUrl ? <p className="text-xs font-semibold text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
