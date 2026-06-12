/**
 * 파일 역할: 보고서 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ArrowLeft, CheckCircle, Pencil, RotateCcw, Save, Sparkles, Trash2, X, XCircle } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { use, useEffect, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/ErrorPage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ErrorPage } from "@/components/common/ErrorPage";
// 코드 설명: @/components/report/ReportAttachmentPreview 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ReportAttachmentPreview } from "@/components/report/ReportAttachmentPreview";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Button 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Button } from "@/components/common/Button";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/lib/mediaUrl 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { normalizeMediaUrl } from "@/lib/mediaUrl";
// 코드 설명: @/lib/apiClient 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { isApiError } from "@/lib/apiClient";
// 코드 설명: @/features/reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { approveReport, deleteReport, deleteReportAttachment, getReport, getReportAnalysisJobs, getReportAnalysisStatus, rejectReport, requestReportAnalysis, retryReportAnalysisJob, updateReport, updateReportStatus, uploadReportAttachments } from "@/features/reports/api";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/features/reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Report, ReportAnalysisJob, ReportAnalysisStatus, ReportAttachment, UpdateReportPayload } from "@/features/reports/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";

// 코드 설명: reportTypeLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const reportTypeLabels: Record<string, string> = {
  GENERAL: "일반",
  ACCIDENT: "이벤트",
  LANE_STOP_REPORT: "주행차로 정차",
  SHOULDER_STOP_REPORT: "갓길 정차",
  UNKNOWN_REPORT: "유형 미확인",
};

// 코드 설명: purposeLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const purposeLabels: Record<string, string> = {
  ANALYSIS: "분석",
  REPORT: "신고",
  NORMAL_REFERENCE: "정상 참고",
  TEST_DEMO: "테스트 데모",
};

// 코드 설명: statusLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusLabels: Record<string, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토중",
  ANALYZING: "분석중",
  CONVERTED_TO_INCIDENT: "이벤트 전환",
  REJECTED: "반려",
  CLOSED: "종료",
  DELETED: "삭제됨",
};

// 코드 설명: priorityLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const priorityLabels: Record<string, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  MEDIUM: "중간",
  HIGH: "높음",
  URGENT: "긴급",
};

// 코드 설명: reportTypeOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const reportTypeOptions = ["GENERAL", "ACCIDENT", "LANE_STOP_REPORT", "SHOULDER_STOP_REPORT", "UNKNOWN_REPORT"];
// 코드 설명: purposeOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const purposeOptions = ["ANALYSIS", "REPORT", "NORMAL_REFERENCE", "TEST_DEMO"];
// 코드 설명: priorityOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const priorityOptions = ["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"];

// 코드 설명: getReportId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportId(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String(report.id)
  return String(report.id);
}

// 코드 설명: getReportCode 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportCode(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.report_code ?? report.reportCode ?? String(report.id ?? "-")
  return report.report_code ?? report.reportCode ?? String(report.id ?? "-");
}

// 코드 설명: getReportTitle 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportTitle(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.title ?? report.subject ?? "제목 없음"
  return report.title ?? report.subject ?? "제목 없음";
}

// 코드 설명: getReportType 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportType(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.report_type ?? report.reportType ?? "GENERAL"
  return report.report_type ?? report.reportType ?? "GENERAL";
}

// 코드 설명: getUploadPurpose 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getUploadPurpose(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.upload_purpose ?? report.purpose ?? "ANALYSIS"
  return report.upload_purpose ?? report.purpose ?? "ANALYSIS";
}

// 코드 설명: getReportStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportStatus(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.status ?? "SUBMITTED"
  return report.status ?? "SUBMITTED";
}

// 코드 설명: getReportPriority 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportPriority(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.priority ?? "NORMAL"
  return report.priority ?? "NORMAL";
}

// 코드 설명: getReportLocation 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportLocation(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.location ?? report.address ?? report.place_name ?? report.locati…
  return report.location ?? report.address ?? report.place_name ?? report.locationName ?? "";
}

// 코드 설명: getReportDescription 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportDescription(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.description ?? ""
  return report.description ?? "";
}

// 코드 설명: getReportCreatedAt 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportCreatedAt(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.submitted_at ?? report.created_at ?? report.createdAt ?? "-"
  return report.submitted_at ?? report.created_at ?? report.createdAt ?? "-";
}

// 코드 설명: getAnalysisStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAnalysisStatus(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.analysis_status ?? report.analysisStatus ?? "WAITING"
  return report.analysis_status ?? report.analysisStatus ?? "WAITING";
}

// 코드 설명: getAnalysisSummary 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAnalysisSummary(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.analysis_summary ?? report.analysisSummary ?? "분석 결과가 아직 없습니다."
  return report.analysis_summary ?? report.analysisSummary ?? "분석 결과가 아직 없습니다.";
}

// 코드 설명: getAnalysisStatusValue 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAnalysisStatusValue(report: Report, status?: ReportAnalysisStatus | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: status?.analysis_status ?? status?.status ?? status?.latest_job?.job_st…
  return status?.analysis_status ?? status?.status ?? status?.latest_job?.job_status ?? status?.latest_job?.status ?? report.analysis_status ?? report.analysisStatus ?? "WAITING";
}

// 코드 설명: getAnalysisSummaryValue 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAnalysisSummaryValue(report: Report, status?: ReportAnalysisStatus | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: status?.analysis_summary ?? status?.summary ?? status?.latest_job?.summ…
  return status?.analysis_summary ?? status?.summary ?? status?.latest_job?.summary ?? report.analysis_summary ?? report.analysisSummary ?? "분석 결과가 아직 없습니다.";
}

// 코드 설명: isAnalysisRunning 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isAnalysisRunning(status: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: ["QUEUED", "RUNNING", "PROCESSING", "ANALYZING", "REQUESTED"].includes(…
  return ["QUEUED", "RUNNING", "PROCESSING", "ANALYZING", "REQUESTED"].includes(status);
}

// 코드 설명: isAnalysisTerminal 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isAnalysisTerminal(status: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: ["COMPLETED", "FAILED", "CANCELLED"].includes(status)
  return ["COMPLETED", "FAILED", "CANCELLED"].includes(status);
}

// 코드 설명: getBadgeTone 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getBadgeTone(value: string): "slate" | "blue" | "green" | "amber" | "red" {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["REJECTED", "DELETED", "URGENT", "HIGH", "CRITICAL", "FAILED"].include…
  if (["REJECTED", "DELETED", "URGENT", "HIGH", "CRITICAL", "FAILED"].includes(value)) return "red";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["QUEUED", "RUNNING", "PROCESSING", "ANALYZING", "MEDIUM"].includes(val…
  if (["QUEUED", "RUNNING", "PROCESSING", "ANALYZING", "MEDIUM"].includes(value)) return "amber";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["CONVERTED_TO_INCIDENT", "COMPLETED", "LOW"].includes(value)
  if (["CONVERTED_TO_INCIDENT", "COMPLETED", "LOW"].includes(value)) return "green";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["REVIEWING", "REQUESTED", "WAITING", "NORMAL"].includes(value)
  if (["REVIEWING", "REQUESTED", "WAITING", "NORMAL"].includes(value)) return "blue";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "slate"
  return "slate";
}

// 코드 설명: formatDateTime 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatDateTime(value: string | null | undefined) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "-";
  // 코드 설명: date 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const date = new Date(value);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Number.isNaN(date.getTime())
  if (Number.isNaN(date.getTime())) return value;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", d…
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

// 코드 설명: InfoRow 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-bold text-slate-800 [overflow-wrap:anywhere]">{value === null || value === undefined || value === "" ? "-" : value}</dd>
    </div>
  );
}

// 코드 설명: getAttachmentId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAttachmentId(attachment?: ReportAttachment) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment?.attachment_id ?? attachment?.id
  return attachment?.attachment_id ?? attachment?.id;
}

// 코드 설명: getAttachmentName 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAttachmentName(attachment?: ReportAttachment) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment?.original_filename ?? attachment?.filename ?? "첨부파일"
  return attachment?.original_filename ?? attachment?.filename ?? "첨부파일";
}

// 코드 설명: getAttachmentType 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAttachmentType(attachment?: ReportAttachment) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment?.mime_type ?? attachment?.file_type ?? "-"
  return attachment?.mime_type ?? attachment?.file_type ?? "-";
}

// 코드 설명: getJobId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getJobId(job: ReportAnalysisJob) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: job.analysis_job_id ?? job.id
  return job.analysis_job_id ?? job.id;
}

// 코드 설명: getJobStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getJobStatus(job: ReportAnalysisJob) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: job.job_status ?? job.status ?? "-"
  return job.job_status ?? job.status ?? "-";
}

// 코드 설명: getRetryErrorMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getRetryErrorMessage(error: unknown) {
  // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const message = error instanceof Error ? error.message : "";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: message.includes("409")
  if (message.includes("409")) return "이미 진행 중인 분석 작업입니다.";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: message.includes("403") || message.includes("권한")
  if (message.includes("403") || message.includes("권한")) return "권한이 없습니다.";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: message.includes("404") || message.includes("찾을 수")
  if (message.includes("404") || message.includes("찾을 수")) return "분석 대상 정보를 찾을 수 없습니다.";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "분석 작업 재시도에 실패했습니다. 잠시 후 다시 시도해 주세요."
  return "분석 작업 재시도에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}


// 코드 설명: normalizeAnalysisJobs 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeAnalysisJobs(value: unknown): ReportAnalysisJob[] {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(value)
  if (Array.isArray(value)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: value
    return value;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value && typeof value === "object"
  if (value && typeof value === "object") {
    // 코드 설명: objectValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const objectValue = value as {
      analysisJobs?: unknown;
      jobs?: unknown;
      data?: unknown;
      items?: unknown;
      results?: unknown;
    };

    // 코드 설명: candidates 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const candidates = [
      objectValue.analysisJobs,
      objectValue.jobs,
      objectValue.data,
      objectValue.items,
      objectValue.results,
    ];

    // 코드 설명: 목록 또는 조건을 순회하면서 각 항목에 같은 처리 규칙을 적용합니다.
    for (const candidate of candidates) {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(candidate)
      if (Array.isArray(candidate)) {
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: candidate as ReportAnalysisJob[]
        return candidate as ReportAnalysisJob[];
      }
    }
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: []
  return [];
}


// 코드 설명: formatReportDisplayValue 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatReportDisplayValue(value: unknown, fallback = "-"): string {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value === null || value === undefined || value === ""
  if (value === null || value === undefined || value === "") {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: fallback
    return fallback;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof value === "string" || typeof value === "number" || typeof value …
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String(value)
    return String(value);
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Array.isArray(value)
  if (Array.isArray(value)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: value.length > 0 ? `${value.length}개` : fallback
    return value.length > 0 ? `${value.length}개` : fallback;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof value === "object"
  if (typeof value === "object") {
    // 코드 설명: objectValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const objectValue = value as {
      status?: unknown;
      count?: unknown;
      frames_processed?: unknown;
      filename?: unknown;
      message?: unknown;
      summary?: unknown;
    };

    // 코드 설명: summary 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const summary = objectValue.summary ?? objectValue.message;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: summary
    if (summary) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: formatReportDisplayValue(summary, fallback)
      return formatReportDisplayValue(summary, fallback);
    }

    // 코드 설명: parts 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const parts: string[] = [];

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: objectValue.status
    if (objectValue.status) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: parts.push(`상태 ${formatReportDisplayValue(objectValue.status, "")}`);
      parts.push(`상태 ${formatReportDisplayValue(objectValue.status, "")}`);
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: objectValue.count !== undefined
    if (objectValue.count !== undefined) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: parts.push(`감지 ${formatReportDisplayValue(objectValue.count, "0")}건`);
      parts.push(`감지 ${formatReportDisplayValue(objectValue.count, "0")}건`);
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: objectValue.frames_processed !== undefined
    if (objectValue.frames_processed !== undefined) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: parts.push(`처리 프레임 ${formatReportDisplayValue(objectValue.frames_proces…
      parts.push(`처리 프레임 ${formatReportDisplayValue(objectValue.frames_processed, "0")}`);
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: objectValue.filename
    if (objectValue.filename) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: parts.push(`파일 ${formatReportDisplayValue(objectValue.filename, "")}`);
      parts.push(`파일 ${formatReportDisplayValue(objectValue.filename, "")}`);
    }

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: parts.length > 0 ? parts.join(" · ") : JSON.stringify(value)
    return parts.length > 0 ? parts.join(" · ") : JSON.stringify(value);
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: fallback
  return fallback;
}

// 코드 설명: ReportDetailPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 코드 설명: { id } 비동기 라우트 매개변수 또는 React 리소스를 현재 렌더링 값으로 해제합니다.
  const { id } = use(params);
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [report, setReport] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [report, setReport] = useState<Report | null>(null);
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [editDraft, setEditDraft] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [editDraft, setEditDraft] = useState<UpdateReportPayload>({});
  // 코드 설명: [isEditing, setIsEditing] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isEditing, setIsEditing] = useState(false);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 코드 설명: [errorStatus, setErrorStatus] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  // 코드 설명: [actionError, setActionError] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [actionError, setActionError] = useState<string | null>(null);
  // 코드 설명: [requestingAnalysis, setRequestingAnalysis] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [requestingAnalysis, setRequestingAnalysis] = useState(false);
  // 코드 설명: [uploadingAttachment, setUploadingAttachment] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  // 코드 설명: [deletingAttachmentId, setDeletingAttachmentId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  // 코드 설명: [analysisStatusResult, setAnalysisStatusResult] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [analysisStatusResult, setAnalysisStatusResult] = useState<ReportAnalysisStatus | null>(null);
  // 코드 설명: [analysisJobs, setAnalysisJobs] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [analysisJobs, setAnalysisJobs] = useState<ReportAnalysisJob[]>([]);
  // 코드 설명: [retryingJobId, setRetryingJobId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  // 코드 설명: [pollingAnalysis, setPollingAnalysis] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [pollingAnalysis, setPollingAnalysis] = useState(false);
  // 코드 설명: [updatingOperation, setUpdatingOperation] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [updatingOperation, setUpdatingOperation] = useState(false);
  // 코드 설명: [saving, setSaving] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [saving, setSaving] = useState(false);
  // 코드 설명: [deleting, setDeleting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [deleting, setDeleting] = useState(false);

  // 코드 설명: beginEdit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function beginEdit(nextReport = report) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !nextReport
    if (!nextReport) return;
    // 코드 설명: setEditDraft 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
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
    // 코드 설명: setIsEditing 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsEditing(true);
  }

  // 코드 설명: loadReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadReport() {
    // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);
    // 코드 설명: setErrorStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorStatus(null);
    // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionError(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: nextReport 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextReport = await getReport(id);
      // 코드 설명: setReport 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReport(nextReport);
      // 코드 설명: setAnalysisStatusResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setAnalysisStatusResult(null);
      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: setAnalysisJobs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setAnalysisJobs(normalizeAnalysisJobs(await getReportAnalysisJobs(getReportId(nextReport))));
      } catch {
        // 코드 설명: setAnalysisJobs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setAnalysisJobs([]);
      }
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isEditing
      if (isEditing) beginEdit(nextReport);
    } catch (error) {
      // 코드 설명: setErrorStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorStatus(isApiError(error) ? error.statusCode : 500);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "신고 상세를 불러오지 못했습니다.");
      // 코드 설명: setReport 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReport(null);
      // 코드 설명: setAnalysisJobs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setAnalysisJobs([]);
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

  // 코드 설명: handleRequestAnalysis 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleRequestAnalysis() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: setRequestingAnalysis 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setRequestingAnalysis(true);
    // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionError(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: reportId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const reportId = getReportId(report);
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await requestReportAnalysis(reportId);
      // 코드 설명: jobs 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const jobs = normalizeAnalysisJobs(response.jobs ?? response.data?.jobs ?? response);
      // 코드 설명: requestedJobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const requestedJobId = response.job_id ?? response.data?.job_id ?? jobs[0]?.analysis_job_id ?? jobs[0]?.id;
      // 코드 설명: latestJob 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const latestJob = jobs[0] ? { ...jobs[0], job_status: jobs[0].job_status ?? jobs[0].status ?? "QUEUED" } : null;

      // 코드 설명: setAnalysisStatusResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setAnalysisStatusResult({
        report_id: reportId,
        analysis_job_id: requestedJobId,
        analysis_status: latestJob?.job_status ?? "QUEUED",
        latest_job: latestJob,
      });

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: nextJobs 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const nextJobs = normalizeAnalysisJobs(await getReportAnalysisJobs(reportId));
        // 코드 설명: setAnalysisJobs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setAnalysisJobs(nextJobs.length > 0 ? nextJobs : jobs);
      } catch {
        // 코드 설명: setAnalysisJobs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setAnalysisJobs(jobs);
      }
    } catch {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError("분석 요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 코드 설명: setRequestingAnalysis 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setRequestingAnalysis(false);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;

    // 코드 설명: currentReport 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const currentReport = report;
    // 코드 설명: reportId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const reportId = getReportId(currentReport);
    // 코드 설명: currentStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const currentStatus = getAnalysisStatusValue(currentReport, analysisStatusResult);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isAnalysisRunning(currentStatus)
    if (!isAnalysisRunning(currentStatus)) {
      // 코드 설명: setPollingAnalysis 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setPollingAnalysis(false);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: disposed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let disposed = false;
    // 코드 설명: timer 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let timer: number | undefined;

    // 코드 설명: pollAnalysisStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function pollAnalysisStatus() {
      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: nextStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const nextStatus = await getReportAnalysisStatus(reportId);
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: disposed
        if (disposed) return;
        // 코드 설명: setAnalysisStatusResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setAnalysisStatusResult(nextStatus);

        // 코드 설명: statusValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const statusValue = getAnalysisStatusValue(currentReport, nextStatus);
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isAnalysisTerminal(statusValue)
        if (isAnalysisTerminal(statusValue)) {
          // 코드 설명: setPollingAnalysis 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setPollingAnalysis(false);
          // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadReport();
          await loadReport();
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
          return;
        }

        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: timer = window.setTimeout(pollAnalysisStatus, 3000);
        timer = window.setTimeout(pollAnalysisStatus, 3000);
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) {
          // 코드 설명: setPollingAnalysis 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setPollingAnalysis(false);
          // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setActionError("분석 상태를 불러오지 못했습니다.");
        }
      }
    }

    // 코드 설명: setPollingAnalysis 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setPollingAnalysis(true);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: timer = window.setTimeout(pollAnalysisStatus, 3000);
    timer = window.setTimeout(pollAnalysisStatus, 3000);

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { disposed = true; if (timer) window.clearTimeout(timer); }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: disposed = true;
      disposed = true;
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: timer
      if (timer) window.clearTimeout(timer);
    };
  }, [report?.id, report?.analysis_status, analysisStatusResult?.analysis_status, analysisStatusResult?.status]);

  // 코드 설명: handleRetryAnalysisJob 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleRetryAnalysisJob(job: ReportAnalysisJob) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: jobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const jobId = getJobId(job);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !jobId || getJobStatus(job) !== "FAILED"
    if (!jobId || getJobStatus(job) !== "FAILED") return;

    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm("실패한 분석 작업을 재시도하시겠습니까?");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: setRetryingJobId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setRetryingJobId(String(jobId));
    // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionError(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: retriedJob 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const retriedJob = await retryReportAnalysisJob(jobId);
      // 코드 설명: [nextStatus, nextJobs] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const [nextStatus, nextJobs] = await Promise.all([
        getReportAnalysisStatus(getReportId(report)),
        getReportAnalysisJobs(getReportId(report)),
      ]);
      // 코드 설명: setAnalysisStatusResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setAnalysisStatusResult(nextStatus);
      // 코드 설명: setAnalysisJobs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setAnalysisJobs(normalizeAnalysisJobs(nextJobs));

      // 코드 설명: retriedStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const retriedStatus = getJobStatus(retriedJob);
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isAnalysisRunning(retriedStatus)
      if (!isAnalysisRunning(retriedStatus)) await loadReport();
    } catch (error) {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError(getRetryErrorMessage(error));
      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: setAnalysisJobs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setAnalysisJobs(normalizeAnalysisJobs(await getReportAnalysisJobs(getReportId(report))));
      } catch {
        // 코드 설명: setAnalysisJobs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setAnalysisJobs([]);
      }
    } finally {
      // 코드 설명: setRetryingJobId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setRetryingJobId(null);
    }
  }

  // 코드 설명: handleChangeStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleChangeStatus(nextStatus: string, reason: string) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: setUpdatingOperation 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setUpdatingOperation(true);
    // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionError(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await updateReportStatus(getReportId(report), { status: nextStatus, rea…
      await updateReportStatus(getReportId(report), { status: nextStatus, reason });
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadReport();
      await loadReport();
    } catch (error) {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError(error instanceof Error ? error.message : "신고 상태 변경에 실패했습니다.");
    } finally {
      // 코드 설명: setUpdatingOperation 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setUpdatingOperation(false);
    }
  }

  // 코드 설명: handleApprove 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleApprove() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: memo 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const memo = window.prompt("승인 메모를 입력해 주세요.", "신고 내용 확인 완료");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: memo === null
    if (memo === null) return;

    // 코드 설명: setUpdatingOperation 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setUpdatingOperation(true);
    // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionError(null);
    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await approveReport(getReportId(report), memo);
      await approveReport(getReportId(report), memo);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadReport();
      await loadReport();
    } catch (error) {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError(error instanceof Error ? error.message : "신고 승인에 실패했습니다.");
    } finally {
      // 코드 설명: setUpdatingOperation 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setUpdatingOperation(false);
    }
  }

  // 코드 설명: handleReject 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleReject() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: reason 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const reason = window.prompt("반려 사유를 입력해 주세요.", "");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: reason === null
    if (reason === null) return;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !reason.trim()
    if (!reason.trim()) {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError("반려 사유를 입력해 주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: setUpdatingOperation 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setUpdatingOperation(true);
    // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionError(null);
    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await rejectReport(getReportId(report), reason.trim());
      await rejectReport(getReportId(report), reason.trim());
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadReport();
      await loadReport();
    } catch (error) {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError(error instanceof Error ? error.message : "신고 반려에 실패했습니다.");
    } finally {
      // 코드 설명: setUpdatingOperation 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setUpdatingOperation(false);
    }
  }

  // 코드 설명: handleUploadAttachments 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleUploadAttachments(files: FileList | null) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report || !files || files.length === 0
    if (!report || !files || files.length === 0) return;
    // 코드 설명: setUploadingAttachment 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setUploadingAttachment(true);
    // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionError(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await uploadReportAttachments(getReportId(report), Array.from(files));
      await uploadReportAttachments(getReportId(report), Array.from(files));
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadReport();
      await loadReport();
    } catch (error) {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError(error instanceof Error ? error.message : "첨부파일 추가에 실패했습니다.");
    } finally {
      // 코드 설명: setUploadingAttachment 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setUploadingAttachment(false);
    }
  }

  // 코드 설명: handleDeleteAttachment 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDeleteAttachment(attachment: ReportAttachment) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: attachmentId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const attachmentId = getAttachmentId(attachment);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !attachmentId
    if (!attachmentId) {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError("삭제할 첨부파일 ID가 없습니다.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm(`${getAttachmentName(attachment)} 파일을 삭제하시겠습니까?`);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: reason 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const reason = window.prompt("삭제 사유를 입력해 주세요. 비워두면 사유 없이 삭제됩니다.", "");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: reason === null
    if (reason === null) return;

    // 코드 설명: setDeletingAttachmentId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDeletingAttachmentId(String(attachmentId));
    // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionError(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await deleteReportAttachment(getReportId(report), attachmentId, reason.…
      await deleteReportAttachment(getReportId(report), attachmentId, reason.trim() || undefined);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadReport();
      await loadReport();
    } catch (error) {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError(error instanceof Error ? error.message : "첨부파일 삭제에 실패했습니다.");
    } finally {
      // 코드 설명: setDeletingAttachmentId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDeletingAttachmentId(null);
    }
  }

  // 코드 설명: handleUpdate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleUpdate() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: setSaving 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSaving(true);
    // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionError(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: payload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const payload: UpdateReportPayload = {
        ...editDraft,
        subject: editDraft.subject ?? editDraft.title,
        latitude: editDraft.latitude === undefined || Number.isNaN(Number(editDraft.latitude)) ? undefined : Number(editDraft.latitude),
        longitude: editDraft.longitude === undefined || Number.isNaN(Number(editDraft.longitude)) ? undefined : Number(editDraft.longitude),
      };
      // 코드 설명: nextReport 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextReport = await updateReport(getReportId(report), payload);
      // 코드 설명: setReport 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReport(nextReport);
      // 코드 설명: setIsEditing 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsEditing(false);
    } catch (error) {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError(error instanceof Error ? error.message : "신고 수정에 실패했습니다.");
    } finally {
      // 코드 설명: setSaving 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSaving(false);
    }
  }

  // 코드 설명: handleDelete 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDelete() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
    if (!report) return;
    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm("신고를 삭제/취소하시겠습니까?");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: setDeleting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDeleting(true);
    // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionError(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await deleteReport(getReportId(report));
      await deleteReport(getReportId(report));
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.replace("/reports");
    } catch (error) {
      // 코드 설명: setActionError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionError(error instanceof Error ? error.message : "신고 삭제에 실패했습니다.");
    } finally {
      // 코드 설명: setDeleting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDeleting(false);
    }
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: loading
  if (loading) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <RequireAuth>
        <AppLayout title="신고 상세">
          <Card className="p-8 text-center text-sm font-semibold text-slate-500">신고 상세를 불러오는 중입니다.</Card>
        </AppLayout>
      </RequireAuth>
    );
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !report
  if (!report) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <RequireAuth>
        <AppLayout title="신고 상세">
          <ErrorPage statusCode={errorStatus ?? 404} title={errorStatus === 403 ? "신고 접근 권한이 없습니다" : errorStatus === 500 ? "신고를 불러오지 못했습니다" : "신고를 찾을 수 없습니다"} description={errorMessage ?? "요청한 신고가 존재하지 않거나 접근할 수 없습니다."} actionLabel="신고 목록으로 이동" actionHref="/reports" secondaryActionLabel="대시보드로 이동" secondaryActionHref="/dashboard" />
        </AppLayout>
      </RequireAuth>
    );
  }

  // 코드 설명: status 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const status = getReportStatus(report);
  // 코드 설명: isOperationsAdmin 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isOperationsAdmin = authUser?.account_status?.toUpperCase() === "ACTIVE" && ["SUPER_ADMIN", "CONTROL_ADMIN"].includes(authUser.role ?? "");
  // 코드 설명: canApprove 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canApprove = isOperationsAdmin && (report.allowed_actions?.approve ?? true);
  // 코드 설명: canReject 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canReject = isOperationsAdmin && (report.allowed_actions?.reject ?? true);
  // 코드 설명: canChangeStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canChangeStatus = isOperationsAdmin && (report.allowed_actions?.change_status ?? true);
  // 코드 설명: canRequestAnalysis 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canRequestAnalysis = isOperationsAdmin && (report.allowed_actions?.request_analysis ?? true);
  // 코드 설명: canRetryAnalysis 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canRetryAnalysis = isOperationsAdmin && (report.allowed_actions?.retry_analysis ?? true);
  // 코드 설명: priority 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const priority = getReportPriority(report);
  // 코드 설명: reportType 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const reportType = getReportType(report);
  // 코드 설명: purpose 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const purpose = getUploadPurpose(report);
  // 코드 설명: analysisStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const analysisStatus = getAnalysisStatusValue(report, analysisStatusResult);
  // 코드 설명: analysisSummary 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const analysisSummary = getAnalysisSummaryValue(report, analysisStatusResult);
  // 코드 설명: riskLevel 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const riskLevel = analysisStatusResult?.risk_level ?? analysisStatusResult?.latest_job?.risk_level ?? report.risk_level;
  // 코드 설명: riskScore 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const riskScore = analysisStatusResult?.risk_score ?? analysisStatusResult?.latest_job?.risk_score ?? report.risk_score;
  // 코드 설명: convertedIncidentId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const convertedIncidentId = analysisStatusResult?.converted_incident_id ?? analysisStatusResult?.latest_job?.converted_incident_id ?? report.converted_incident_id ?? report.convertedIncidentCode;
  // 코드 설명: analysisSummaryCandidates 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const analysisSummaryCandidates = [
    analysisStatusResult?.latest_job,
    ...(analysisJobs ?? []),
    { result_summary: (analysisStatusResult as any)?.analysis_summary },
  ]
    .map((item) => (item as any)?.result_summary ?? item)
    .filter((item) => item && typeof item === "object") as Record<string, any>[];

  // 코드 설명: annotatedVideoUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const annotatedVideoUrl =
    analysisSummaryCandidates
      .map((summary) => normalizeMediaUrl(summary.annotated_video_url ?? summary.annotated_media?.video_url ?? null))
      .find(Boolean) ?? null;

  // 코드 설명: annotatedImageUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const annotatedImageUrl =
    analysisSummaryCandidates
      .map((summary) => summary.annotated_image_url ?? summary.annotated_media?.image_url ?? null)
      .find(Boolean) ?? null;

  // 코드 설명: annotatedMediaUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const annotatedMediaUrl = annotatedVideoUrl ?? annotatedImageUrl;
  // 코드 설명: annotatedMediaType 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const annotatedMediaType = annotatedVideoUrl ? "video" : annotatedImageUrl ? "image" : null;

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
                  {canApprove ? <button type="button" onClick={handleApprove} disabled={updatingOperation} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    승인
                  </button> : null}
                  {canReject ? <button type="button" onClick={handleReject} disabled={updatingOperation} className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    반려
                  </button> : null}
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
                  <InfoRow label="신고번호" value={getReportCode(report)} />
                  <InfoRow label="제목" value={getReportTitle(report)} />
                  <InfoRow label="신고유형" value={reportTypeLabels[reportType] ?? reportType} />
                  <InfoRow label="목적" value={purposeLabels[purpose] ?? purpose} />
                  <InfoRow label="신고자" value={report.reporter_name ?? report.reporter ?? report.reporter_id} />
                  <InfoRow label="위치" value={getReportLocation(report)} />
                  <InfoRow label="CCTV 식별번호" value={report.cctv_id} />
                  <InfoRow label="상태" value={statusLabels[status] ?? status} />
                  <InfoRow label="우선순위" value={priorityLabels[priority] ?? priority} />
                  <InfoRow label="위험도" value={riskLevel} />
                  <InfoRow label="위험점수" value={riskScore} />
                  <InfoRow label="생성일시" value={formatDateTime(getReportCreatedAt(report))} />
                  <InfoRow label="수정일시" value={formatDateTime(report.updated_at)} />
                </dl>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 p-5"><h3 className="text-lg font-black text-slate-950">첨부파일</h3></div>
              <div className="grid min-w-0 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
                <ReportAttachmentPreview report={report} />
                <div className="grid min-w-0 content-start gap-3">
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
                        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: handleUploadAttachments(event.target.files);
                        handleUploadAttachments(event.target.files);
                        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.target.value = "";
                        event.target.value = "";
                      }}
                      className="min-w-0 max-w-full text-xs font-semibold text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white disabled:opacity-50"
                    />
                    {uploadingAttachment ? <span className="text-xs font-semibold text-slate-500">업로드 중입니다.</span> : null}
                  </label>
                  {(report.attachments ?? []).length > 0 ? (
                    <div className="grid min-w-0 gap-2">
                      {(report.attachments ?? []).map((attachment, index) => {
                        // 코드 설명: attachmentId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                        const attachmentId = getAttachmentId(attachment);
                        // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
                        return (
                          <div key={attachmentId ?? `${getAttachmentName(attachment)}-${index}`} className="min-w-0 rounded-lg border border-slate-100 bg-white p-3">
                            <p className="min-w-0 break-all text-xs font-black text-slate-800">{getAttachmentName(attachment)}</p>
                            <p className="mt-1 min-w-0 break-words text-xs font-semibold text-slate-400 [overflow-wrap:anywhere]">{getAttachmentType(attachment)}</p>
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
                <InfoRow label="AI 분석 상태" value={analysisStatus} />
                <InfoRow label="위험도" value={riskLevel} />
                <InfoRow label="위험점수" value={riskScore} />
              </div>
              {annotatedMediaUrl ? (
                <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-black">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3">
                    <p className="text-sm font-black text-white">
                      AI 객체 탐지 결과{annotatedMediaType === "video" ? " 영상" : " 이미지"}
                    </p>
                    <a
                      href={annotatedMediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-sky-300 no-underline hover:text-sky-200"
                    >
                      새 탭에서 열기
                    </a>
                  </div>
                  {annotatedVideoUrl ? (
                    <video
                      src={annotatedVideoUrl}
                      controls
                      playsInline
                      className="block w-full"
                    />
                  ) : (
                    <img
                      src={annotatedImageUrl ?? ""}
                      alt="AI 객체 탐지 결과"
                      className="block w-full"
                    />
                  )}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canRequestAnalysis ? <button type="button" onClick={handleRequestAnalysis} disabled={requestingAnalysis || isAnalysisRunning(analysisStatus)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {requestingAnalysis ? "요청 중" : "분석 요청"}
                </button> : null}
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
                      // 코드 설명: jobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                      const jobId = getJobId(job);
                      // 코드 설명: jobStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                      const jobStatus = getJobStatus(job);
                      // 코드 설명: canRetry 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                      const canRetry = canRetryAnalysis && jobStatus === "FAILED" && Boolean(jobId);

                      // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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

            {canChangeStatus ? <Card className="p-5">
              <h3 className="text-lg font-black text-slate-950">운영 상태 변경</h3>
              <div className="mt-4 grid gap-2">
                {["SUBMITTED", "REVIEWING", "ANALYZING", "CONVERTED_TO_INCIDENT", "REJECTED", "CLOSED"].map((nextStatus) => (
                  <button key={nextStatus} type="button" disabled={updatingOperation || status === nextStatus} onClick={() => handleChangeStatus(nextStatus, `상태를 ${nextStatus}로 변경`)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                    {statusLabels[nextStatus] ?? nextStatus}
                  </button>
                ))}
              </div>
            </Card> : null}

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
