/**
 * 파일 역할: 보고서 영역에서 사용하는 ReportAttachmentPreview UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: @/lib/mediaUrl 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { normalizeMediaUrl } from "@/lib/mediaUrl";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FileVideo } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useState } from "react";
// 코드 설명: @/features/reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { downloadReportAttachment, downloadReportAttachmentUrl, previewReportAttachment, previewReportAttachmentUrl } from "@/features/reports/api";
// 코드 설명: @/features/reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Report, ReportAttachment } from "@/features/reports/types";

// 코드 설명: ReportAttachmentPreviewProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ReportAttachmentPreviewProps = {
  report: Report;
  compact?: boolean;
};

// 코드 설명: getAttachmentId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAttachmentId(attachment?: ReportAttachment, report?: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment?.attachment_id ?? attachment?.id ?? report?.attachment_id
  return attachment?.attachment_id ?? attachment?.id ?? report?.attachment_id;
}

// 코드 설명: getAttachmentName 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAttachmentName(attachment?: ReportAttachment, report?: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment?.original_filename ?? attachment?.filename ?? report?.attach…
  return attachment?.original_filename ?? attachment?.filename ?? report?.attachment_name ?? report?.attachmentName ?? "첨부파일";
}

// 코드 설명: getAttachmentType 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAttachmentType(attachment?: ReportAttachment, report?: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment?.mime_type ?? attachment?.file_type ?? report?.attachment_ty…
  return attachment?.mime_type ?? attachment?.file_type ?? report?.attachment_type ?? report?.attachmentType ?? "";
}

// 코드 설명: getPreviewUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getPreviewUrl(report: Report, attachment?: ReportAttachment) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeMediaUrl(attachment?.preview_url ?? attachment?.file_url ?? re…
  return normalizeMediaUrl(attachment?.preview_url ?? attachment?.file_url ?? report.preview_url ?? report.thumbnail_url ?? null) ?? undefined;
}

// 코드 설명: getDownloadUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getDownloadUrl(report: Report, attachment?: ReportAttachment) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeMediaUrl(attachment?.download_url ?? report.download_url ?? nu…
  return normalizeMediaUrl(attachment?.download_url ?? report.download_url ?? null) ?? undefined;
}

// 코드 설명: isImageType 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isImageType(type: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].some…
  return type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].some((ext) => type.toLowerCase().includes(ext));
}

// 코드 설명: ReportAttachmentPreview 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ReportAttachmentPreview({ report, compact = false }: ReportAttachmentPreviewProps) {
  // 코드 설명: attachments 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const attachments = report.attachments ?? [];
  // 코드 설명: firstAttachment 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const firstAttachment = attachments[0];
  // 코드 설명: attachmentId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const attachmentId = getAttachmentId(firstAttachment, report);
  // 코드 설명: previewUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const previewUrl = getPreviewUrl(report, firstAttachment);
  // 코드 설명: downloadUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const downloadUrl = getDownloadUrl(report, firstAttachment);
  // 코드 설명: [objectUrl, setObjectUrl] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  // 코드 설명: [blobType, setBlobType] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [blobType, setBlobType] = useState("");
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: attachmentType 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const attachmentType = getAttachmentType(firstAttachment, report) || blobType;
  // 코드 설명: hasAttachment 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const hasAttachment = Boolean(attachmentId || previewUrl || downloadUrl || (report.attachment_count ?? 0) > 0);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: disposed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let disposed = false;
    // 코드 설명: nextObjectUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let nextObjectUrl: string | null = null;

    // 코드 설명: loadPreview 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function loadPreview() {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("");
      // 코드 설명: setObjectUrl 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setObjectUrl(null);
      // 코드 설명: setBlobType 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setBlobType("");

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !attachmentId && !previewUrl
      if (!attachmentId && !previewUrl) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: hasAttachment
        if (hasAttachment) setErrorMessage("미리보기 URL이 없습니다.");
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: blob 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const blob = attachmentId ? await previewReportAttachment(attachmentId) : await previewReportAttachmentUrl(previewUrl as string);
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: disposed
        if (disposed) return;
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: nextObjectUrl = URL.createObjectURL(blob);
        nextObjectUrl = URL.createObjectURL(blob);
        // 코드 설명: setBlobType 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setBlobType(blob.type);
        // 코드 설명: setObjectUrl 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setObjectUrl(nextObjectUrl);
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) setErrorMessage(error instanceof Error ? error.message : "첨부파일 미리보기를 불러오지 못했습니다.");
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadPreview();
    loadPreview();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { disposed = true; if (nextObjectUrl) URL.revokeObjectURL(nextObj…
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: disposed = true;
      disposed = true;
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: nextObjectUrl
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [attachmentId, hasAttachment, previewUrl]);

  // 코드 설명: countLabel 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const countLabel = useMemo(() => {
    // 코드 설명: count 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const count = report.attachment_count ?? attachments.length;
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: count > 0 ? `첨부 ${count}개` : "첨부 없음"
    return count > 0 ? `첨부 ${count}개` : "첨부 없음";
  }, [attachments.length, report.attachment_count]);

  // 코드 설명: handleDownload 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDownload() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !attachmentId && !downloadUrl && !previewUrl
    if (!attachmentId && !downloadUrl && !previewUrl) return;

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: blob 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const blob = attachmentId ? await downloadReportAttachment(attachmentId) : await downloadReportAttachmentUrl((downloadUrl ?? previewUrl) as string);
      // 코드 설명: url 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const url = URL.createObjectURL(blob);
      // 코드 설명: link 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const link = document.createElement("a");
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: link.href = url;
      link.href = url;
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: link.download = getAttachmentName(firstAttachment, report);
      link.download = getAttachmentName(firstAttachment, report);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: document.body.appendChild(link);
      document.body.appendChild(link);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: link.click();
      link.click();
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: link.remove();
      link.remove();
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: URL.revokeObjectURL(url);
      URL.revokeObjectURL(url);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "첨부파일 다운로드에 실패했습니다.");
    }
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: compact
  if (compact) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
        <span className="rounded bg-slate-100 px-2 py-1">{countLabel}</span>
        {objectUrl ? <span className="text-sky-700">미리보기 가능</span> : null}
      </div>
    );
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !hasAttachment
  if (!hasAttachment) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <div className="grid aspect-video max-h-[520px] place-items-center rounded-2xl bg-slate-950 text-slate-400">
        <div className="text-center">
          <FileVideo className="mx-auto h-12 w-12" aria-hidden="true" />
          <p className="mt-3 text-sm font-black">첨부파일 없음</p>
        </div>
      </div>
    );
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="grid gap-3">
      <div className="grid aspect-video max-h-[520px] place-items-center overflow-hidden rounded-2xl bg-slate-950 text-white">
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
      {attachmentId || downloadUrl || previewUrl ? <button type="button" onClick={handleDownload} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">다운로드</button> : null}
      {errorMessage && objectUrl ? <p className="text-xs font-semibold text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
