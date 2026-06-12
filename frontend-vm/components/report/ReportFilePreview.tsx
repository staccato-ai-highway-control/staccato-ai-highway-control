/**
 * 파일 역할: 보고서 영역에서 사용하는 ReportFilePreview UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { File as FileIcon, RefreshCw, Trash2, Upload } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { KeyboardEvent, MouseEvent } from "react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useState } from "react";

// 코드 설명: PreviewItem 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type PreviewItem = {
  file: File;
  url: string;
  kind: "image" | "video" | "file";
};

// 코드 설명: ReportFilePreviewProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ReportFilePreviewProps = {
  files?: File[];
  onSelectFiles: () => void;
  onRemoveFile?: (index: number) => void;
};

// 코드 설명: getFileKind 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getFileKind(file: File): PreviewItem["kind"] {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: file.type.startsWith("image/")
  if (file.type.startsWith("image/")) return "image";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: file.type.startsWith("video/")
  if (file.type.startsWith("video/")) return "video";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "file"
  return "file";
}

// 코드 설명: formatFileSize 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatFileSize(size: number) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: size < 1024
  if (size < 1024) return `${size} B`;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: size < 1024 * 1024
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

// 코드 설명: ReportFilePreview 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ReportFilePreview({ files = [], onSelectFiles, onRemoveFile }: ReportFilePreviewProps) {
  // 코드 설명: [previews, setPreviews] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [previews, setPreviews] = useState<PreviewItem[]>([]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: nextPreviews 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const nextPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      kind: getFileKind(file),
    }));

    // 코드 설명: setPreviews 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setPreviews(nextPreviews);

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { nextPreviews.forEach((item) => URL.revokeObjectURL(item.url)); }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: nextPreviews.forEach((item) => URL.revokeObjectURL(item.url));
      nextPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [files]);

  // 코드 설명: handlePreviewKeyDown 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handlePreviewKeyDown(event: KeyboardEvent<HTMLElement>) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: event.key !== "Enter" && event.key !== " "
    if (event.key !== "Enter" && event.key !== " ") return;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: onSelectFiles();
    onSelectFiles();
  }

  // 코드 설명: stopPreviewClick 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function stopPreviewClick(event: MouseEvent<HTMLElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.stopPropagation();
    event.stopPropagation();
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: previews.length === 0
  if (previews.length === 0) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
                    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.stopPropagation();
                    event.stopPropagation();
                    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: onRemoveFile(index);
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
