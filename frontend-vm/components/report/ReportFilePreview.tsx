"use client";

import { useEffect, useState } from "react";

type PreviewItem = {
  file: File;
  url: string;
  kind: "image" | "video" | "file";
};

type ReportFilePreviewProps = {
  files?: File[];
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

export function ReportFilePreview({ files = [] }: ReportFilePreviewProps) {
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

  if (previews.length === 0) {
    return (
      <section className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <div>
          <p className="text-sm font-black text-slate-700">파일 미리보기</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            이미지 또는 영상을 선택하면 이 영역에 미리보기가 표시됩니다.
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
        <p className="text-sm font-black text-slate-800">선택한 파일 미리보기</p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
          {previews.length}개 파일
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {previews.map((item) => (
          <article key={`${item.file.name}-${item.file.size}-${item.file.lastModified}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid aspect-video place-items-center bg-slate-100">
              {item.kind === "image" ? (
                <img src={item.url} alt={item.file.name} className="h-full w-full object-contain" />
              ) : item.kind === "video" ? (
                <video src={item.url} controls className="h-full w-full bg-black object-contain" />
              ) : (
                <span className="text-sm font-bold text-slate-500">미리보기를 지원하지 않는 파일입니다.</span>
              )}
            </div>

            <div className="grid gap-1 p-3">
              <p className="truncate text-sm font-bold text-slate-800">{item.file.name}</p>
              <p className="text-xs font-semibold text-slate-500">
                {item.file.type || "unknown"} · {formatFileSize(item.file.size)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
