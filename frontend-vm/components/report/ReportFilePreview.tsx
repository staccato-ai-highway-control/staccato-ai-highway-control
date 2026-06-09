"use client";

import { File as FileIcon, RefreshCw, Trash2, Upload } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";

type PreviewItem = {
  file: File;
  url: string;
  kind: "image" | "video" | "file";
};

type ReportFilePreviewProps = {
  files?: File[];
  onSelectFiles: () => void;
  onRemoveFile?: (index: number) => void;
};

function getFileKind(file: File): PreviewItem["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function ReportFilePreview({ files = [], onSelectFiles, onRemoveFile }: ReportFilePreviewProps) {
  const [previews, setPreviews] = useState<PreviewItem[]>([]);

  useEffect(() => {
    const nextPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      kind: getFileKind(file),
    }));

    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [files]);

  function handlePreviewKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelectFiles();
  }

  function stopPreviewClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  if (previews.length === 0) {
    return (
      <section
        role="button"
        tabIndex={0}
        aria-label="신고 파일 선택"
        onClick={onSelectFiles}
        onKeyDown={handlePreviewKeyDown}
        className="group grid min-h-48 cursor-pointer place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-staccato hover:bg-red-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-staccato focus-visible:ring-offset-2"
      >
        <div>
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition group-hover:text-staccato">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-black text-slate-700">파일 미리보기</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            이미지 또는 영상을 선택하면 이 영역에 미리보기가 표시됩니다.
          </p>
          <p className="mt-2 text-sm font-black text-staccato">
            클릭하여 파일을 선택하거나 교체할 수 있습니다.
          </p>
          <p className="mt-1 text-xs font-medium text-slate-400">
            JPG, PNG, MP4 등 이미지/영상 파일을 지원합니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-800">선택한 파일 미리보기</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">카드를 클릭하여 파일을 선택하거나 교체할 수 있습니다.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
          {previews.length}개 파일
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {previews.map((item, index) => (
          <article
            key={`${item.file.name}-${item.file.size}-${item.file.lastModified}`}
            role="button"
            tabIndex={0}
            aria-label={`${item.file.name} 파일 교체`}
            onClick={onSelectFiles}
            onKeyDown={handlePreviewKeyDown}
            className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-staccato hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-staccato focus-visible:ring-offset-2"
          >
            <div className="grid aspect-video place-items-center bg-slate-100">
              {item.kind === "image" ? (
                <img src={item.url} alt={item.file.name} className="h-full w-full object-contain" />
              ) : item.kind === "video" ? (
                <video src={item.url} controls onClick={stopPreviewClick} onKeyDown={(event) => event.stopPropagation()} className="h-full w-full bg-black object-contain" />
              ) : (
                <div className="text-center text-slate-500">
                  <FileIcon className="mx-auto h-8 w-8" aria-hidden="true" />
                  <span className="mt-2 block text-sm font-bold">미리보기를 지원하지 않는 파일입니다.</span>
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{item.file.name}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {item.file.type || "unknown"} · {formatFileSize(item.file.size)}
                </p>
              </div>
              {onRemoveFile ? (
                <button
                  type="button"
                  aria-label={`${item.file.name} 삭제`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveFile(index);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-2 py-1 text-[11px] font-bold text-white opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              파일 교체
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
