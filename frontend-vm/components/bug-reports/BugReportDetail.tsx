/**
 * 파일 역할: 버그 신고 영역에서 사용하는 BugReportDetail UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { use, useEffect, useState } from "react";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Download, Pencil, Save, Upload, X, XCircle } from "lucide-react";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { MarkdownEditor } from "@/components/common/MarkdownEditor";
// 코드 설명: @/features/bug-reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import {
  downloadBugReportAttachment,
  closeBugReport,
  downloadBugReportAttachmentUrl,
  fetchBugReport,
  updateBugReport,
  uploadBugReportAttachments,
} from "@/features/bug-reports/api";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/features/bug-reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { BugReport, BugReportAttachment, BugReportUpdateRequest } from "@/features/bug-reports/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";
// 코드 설명: @/lib/apiClient 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { isApiError } from "@/lib/apiClient";

// 코드 설명: statusLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusLabels: Record<string, string> = {
  OPEN: "열림",
  IN_PROGRESS: "처리중",
  RESOLVED: "해결",
  CLOSED: "닫힘",
};

// 코드 설명: badgeTone 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function badgeTone(value?: string): "slate" | "blue" | "green" | "amber" | "red" {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "slate";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["CRITICAL", "HIGH"].includes(value)
  if (["CRITICAL", "HIGH"].includes(value)) return "red";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["MAJOR", "IN_PROGRESS", "MEDIUM"].includes(value)
  if (["MAJOR", "IN_PROGRESS", "MEDIUM"].includes(value)) return "amber";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["RESOLVED", "CLOSED", "LOW"].includes(value)
  if (["RESOLVED", "CLOSED", "LOW"].includes(value)) return "green";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["OPEN", "MINOR"].includes(value)
  if (["OPEN", "MINOR"].includes(value)) return "blue";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "slate"
  return "slate";
}

// 코드 설명: formatDate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatDate(value?: string | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "-";
  // 코드 설명: date 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const date = new Date(value);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Number.isNaN(date.getTime())
  if (Number.isNaN(date.getTime())) return value;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", d…
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// 코드 설명: getAttachmentName 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAttachmentName(attachment: BugReportAttachment) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment.original_filename ?? attachment.filename ?? "첨부파일"
  return attachment.original_filename ?? attachment.filename ?? "첨부파일";
}

// 코드 설명: getAttachmentType 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAttachmentType(attachment: BugReportAttachment) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment.mime_type ?? attachment.file_type ?? "-"
  return attachment.mime_type ?? attachment.file_type ?? "-";
}

// 코드 설명: DetailRow 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-800 [overflow-wrap:anywhere] [word-break:keep-all]">{value || "-"}</dd>
    </div>
  );
}

// 코드 설명: createEditDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function createEditDraft(report: BugReport): BugReportUpdateRequest {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { title: report.title ?? "", description: report.description ?? "", cat…
  return {
    title: report.title ?? "",
    description: report.description ?? "",
    category: report.category ?? "GENERAL",
    severity: report.severity ?? "MINOR",
    priority: report.priority ?? "MEDIUM",
    page_url: report.page_url ?? "",
  };
}

// 코드 설명: cleanPayload 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function cleanPayload(payload: BugReportUpdateRequest): BugReportUpdateRequest {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Object.fromEntries( Object.entries(payload).filter(([, value]) => value…
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  ) as BugReportUpdateRequest;
}

// 코드 설명: BugReportDetail 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function BugReportDetail({ params }: { params: Promise<{ id: string }> }) {
  // 코드 설명: { id } 비동기 라우트 매개변수 또는 React 리소스를 현재 렌더링 값으로 해제합니다.
  const { id } = use(params);
  // 코드 설명: [report, setReport] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [report, setReport] = useState<BugReport | null>(null);
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [editDraft, setEditDraft] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [editDraft, setEditDraft] = useState<BugReportUpdateRequest>({});
  // 코드 설명: [isEditing, setIsEditing] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isEditing, setIsEditing] = useState(false);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [uploading, setUploading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [uploading, setUploading] = useState(false);
  // 코드 설명: [downloadingId, setDownloadingId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // 코드 설명: [saving, setSaving] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [saving, setSaving] = useState(false);
  // 코드 설명: [closing, setClosing] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [closing, setClosing] = useState(false);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: [errorStatus, setErrorStatus] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  // 코드 설명: [actionMessage, setActionMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [actionMessage, setActionMessage] = useState("");

  // 코드 설명: loadReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadReport() {
    // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");
    // 코드 설명: setErrorStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorStatus(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: nextReport 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextReport = await fetchBugReport(id);
      // 코드 설명: setReport 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReport(nextReport);
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isEditing
      if (isEditing) setEditDraft(createEditDraft(nextReport));
    } catch (error) {
      // 코드 설명: setReport 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReport(null);
      // 코드 설명: setErrorStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorStatus(isApiError(error) ? error.statusCode : 500);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "버그리포트를 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(false);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadReport();
    loadReport();
  }, [id]);

  // 코드 설명: beginEdit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function beginEdit() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: setEditDraft 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setEditDraft(createEditDraft(report));
    // 코드 설명: setIsEditing 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsEditing(true);
    // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionMessage("");
  }

  // 코드 설명: handleUpdate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleUpdate() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !String(editDraft.title ?? "").trim() || !String(editDraft.description …
    if (!String(editDraft.title ?? "").trim() || !String(editDraft.description ?? "").trim()) {
      // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionMessage("제목과 내용을 입력해 주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: setSaving 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSaving(true);
    // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await updateBugReport(report.id, cleanPayload(editDraft));
      await updateBugReport(report.id, cleanPayload(editDraft));
      // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionMessage("버그리포트가 수정되었습니다.");
      // 코드 설명: setIsEditing 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsEditing(false);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadReport();
      await loadReport();
    } catch {
      // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionMessage("버그리포트를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 코드 설명: setSaving 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSaving(false);
    }
  }

  // 코드 설명: handleCloseReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleCloseReport() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm("버그리포트를 닫으시겠습니까?");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: setClosing 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setClosing(true);
    // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await closeBugReport(report.id);
      await closeBugReport(report.id);
      // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionMessage("버그리포트가 닫혔습니다.");
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadReport();
      await loadReport();
    } catch {
      // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionMessage("버그리포트를 닫지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 코드 설명: setClosing 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setClosing(false);
    }
  }

  // 코드 설명: handleUpload 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleUpload(files: FileList | null) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !files || files.length === 0
    if (!files || files.length === 0) return;
    // 코드 설명: setUploading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setUploading(true);
    // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await uploadBugReportAttachments(id, Array.from(files));
      await uploadBugReportAttachments(id, Array.from(files));
      // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionMessage("첨부파일이 업로드되었습니다.");
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadReport();
      await loadReport();
    } catch {
      // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionMessage("첨부파일 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 코드 설명: setUploading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setUploading(false);
    }
  }

  // 코드 설명: handleDownload 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDownload(attachment: BugReportAttachment) {
    // 코드 설명: setDownloadingId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDownloadingId(String(attachment.id));
    // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: blob 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const blob = attachment.download_url
        ? await downloadBugReportAttachmentUrl(attachment.download_url)
        : await downloadBugReportAttachment(attachment.id);
      // 코드 설명: url 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const url = URL.createObjectURL(blob);
      // 코드 설명: link 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const link = document.createElement("a");
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: link.href = url;
      link.href = url;
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: link.download = getAttachmentName(attachment);
      link.download = getAttachmentName(attachment);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: document.body.appendChild(link);
      document.body.appendChild(link);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: link.click();
      link.click();
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: link.remove();
      link.remove();
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: URL.revokeObjectURL(url);
      URL.revokeObjectURL(url);
    } catch {
      // 코드 설명: setActionMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionMessage("첨부파일을 다운로드할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 코드 설명: setDownloadingId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDownloadingId(null);
    }
  }

  // 코드 설명: ownerId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const ownerId = report?.reporter_id ?? report?.author_id ?? report?.user_id;
  // 코드 설명: isActiveUser 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isActiveUser = authUser?.account_status?.toUpperCase() === "ACTIVE";
  // 코드 설명: isOwner 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isOwner = ownerId !== null && ownerId !== undefined && String(ownerId) === String(authUser?.id);
  // 코드 설명: isSuperAdmin 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isSuperAdmin = authUser?.role === "SUPER_ADMIN";
  // 코드 설명: allowedActions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const allowedActions = report?.allowed_actions;
  // 코드 설명: canUpdate 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canUpdate = Boolean(isActiveUser && (allowedActions?.update ?? allowedActions?.edit ?? (isSuperAdmin || isOwner)));
  // 코드 설명: canClose 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canClose = Boolean(isActiveUser && (allowedActions?.close ?? allowedActions?.delete ?? (isSuperAdmin || isOwner)));
  // 코드 설명: canUploadAttachment 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canUploadAttachment = Boolean(isActiveUser && (allowedActions?.upload_attachment ?? (isSuperAdmin || isOwner)));

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <AppLayout title="버그리포트 상세">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="버그리포트 상세"
          description="등록된 오류나 개선 요청의 내용과 처리 상태, 첨부파일을 확인합니다."
          actions={<>
            {report && canUpdate ? <button type="button" onClick={beginEdit} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15"><Pencil className="h-4 w-4" aria-hidden="true" />수정</button> : null}
            {report && canClose ? <button type="button" onClick={handleCloseReport} disabled={closing || report.status === "CLOSED"} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-300/40 bg-red-500/15 px-4 text-sm font-bold text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"><XCircle className="h-4 w-4" aria-hidden="true" />{closing ? "닫는 중" : "닫기"}</button> : null}
            <Link href="/bug-reports" className="inline-flex min-h-11 items-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white no-underline transition hover:bg-white/15">목록으로</Link>
          </>}
        />

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
                    <button type="button" onClick={handleUpdate} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">
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
                  <label className="ui-label">
                    제목
                    <input value={editDraft.title ?? ""} onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))} className="ui-field" />
                  </label>

                  <div className="grid gap-2 text-sm font-bold text-slate-700">
                    <span>내용</span>
                    <MarkdownEditor value={editDraft.description ?? ""} onChange={(description) => setEditDraft((current) => ({ ...current, description }))} />
                  </div>

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

              <article className="rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8">
                <h1 className="border-b border-slate-200 pb-4 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{report.title || "제목 없음"}</h1>
                <MarkdownContent content={report.description || "설명이 없습니다."} className="py-4" />
              </article>

              <dl className="mt-5 grid gap-4 md:grid-cols-4">
                <DetailRow label="카테고리" value={report.category ?? "GENERAL"} />
                <DetailRow label="심각도" value={report.severity ?? "MINOR"} />
                <DetailRow label="우선순위" value={report.priority ?? "MEDIUM"} />
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
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {uploading ? "업로드 중" : "파일 추가"}
                    <input
                      type="file"
                      multiple
                      disabled={uploading}
                      onChange={(event) => {
                        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: handleUpload(event.target.files);
                        handleUpload(event.target.files);
                        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.target.value = "";
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
      </div>
    </AppLayout>
  );
}
