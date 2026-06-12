/**
 * 파일 역할: 보고서 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Search, Sparkles, Upload } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useRef, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/ErrorPage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ErrorPage } from "@/components/common/ErrorPage";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/features/reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getMyReports, getReports, requestReportAnalysis, updateReportStatus } from "@/features/reports/api";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/features/reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { PaginatedReports, Report, ReportListParams } from "@/features/reports/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";

// 코드 설명: ReportFilter 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ReportFilter = {
  keyword: string;
  status: string;
  report_type: string;
  priority: string;
  page: number;
  size: number;
  mine: boolean;
};

// 코드 설명: reportStatusOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const reportStatusOptions = [
  { label: "접수", value: "SUBMITTED" },
  { label: "검토중", value: "REVIEWING" },
  { label: "분석중", value: "ANALYZING" },
  { label: "이벤트 전환", value: "CONVERTED_TO_INCIDENT" },
  { label: "반려", value: "REJECTED" },
  { label: "종결", value: "CLOSED" },
];

// 코드 설명: statusOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusOptions = [
  { label: "전체 상태", value: "" },
  { label: "접수", value: "SUBMITTED" },
  { label: "검토중", value: "REVIEWING" },
  { label: "분석중", value: "ANALYZING" },
  { label: "이벤트 전환", value: "CONVERTED_TO_INCIDENT" },
  { label: "반려", value: "REJECTED" },
];

// 코드 설명: typeOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const typeOptions = [
  { label: "전체 유형", value: "" },
  { label: "일반", value: "GENERAL" },
  { label: "이벤트", value: "ACCIDENT" },
  { label: "주행차로 정차", value: "LANE_STOP_REPORT" },
  { label: "갓길 정차", value: "SHOULDER_STOP_REPORT" },
  { label: "유형 미확인", value: "UNKNOWN_REPORT" },
];

// 코드 설명: priorityOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const priorityOptions = [
  { label: "전체 우선순위", value: "" },
  { label: "낮음", value: "LOW" },
  { label: "보통", value: "NORMAL" },
  { label: "중간", value: "MEDIUM" },
  { label: "높음", value: "HIGH" },
  { label: "긴급", value: "URGENT" },
];

// 코드 설명: statusLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusLabels: Record<string, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토중",
  ANALYZING: "분석중",
  CONVERTED_TO_INCIDENT: "이벤트 전환",
  REJECTED: "반려",
  DELETED: "삭제됨",
};

// 코드 설명: typeLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const typeLabels: Record<string, string> = {
  GENERAL: "일반",
  ACCIDENT: "이벤트",
  LANE_STOP_REPORT: "주행차로 정차",
  SHOULDER_STOP_REPORT: "갓길 정차",
  UNKNOWN_REPORT: "유형 미확인",
};

// 코드 설명: priorityLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const priorityLabels: Record<string, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  MEDIUM: "중간",
  HIGH: "높음",
  URGENT: "긴급",
};

// 코드 설명: getReportId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportId(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String(report.id)
  return String(report.id);
}

// 코드 설명: getReportCode 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportCode(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.report_code ?? report.reportCode ?? `#${report.id}`
  return report.report_code ?? report.reportCode ?? `#${report.id}`;
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

// 코드 설명: getReportCreatedAt 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportCreatedAt(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.submitted_at ?? report.created_at ?? report.createdAt ?? "-"
  return report.submitted_at ?? report.created_at ?? report.createdAt ?? "-";
}

// 코드 설명: getReportLocation 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportLocation(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.location ?? report.address ?? report.place_name ?? report.locati…
  return report.location ?? report.address ?? report.place_name ?? report.locationName ?? "-";
}

// 코드 설명: ReportWithAnalysisAliases 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ReportWithAnalysisAliases = Report & {
  latestJob?: Report["latest_job"];
  latestAnalysisJob?: Report["latest_job"];
  latest_analysis_job?: Report["latest_job"];
  ai_analysis_status?: string | null;
  detection_count?: number | string | null;
  detected_count?: number | string | null;
  processed_frames?: number | string | null;
  processed_frame_count?: number | string | null;
};

// 코드 설명: AnalysisJobWithMetrics 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type AnalysisJobWithMetrics = NonNullable<Report["latest_job"]> & {
  detection_count?: number | string | null;
  detected_count?: number | string | null;
  processed_frames?: number | string | null;
  processed_frame_count?: number | string | null;
};

// 코드 설명: analysisStatusLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const analysisStatusLabels: Record<string, string> = {
  WAITING: "대기",
  REQUESTED: "요청됨",
  QUEUED: "대기열",
  RUNNING: "실행중",
  PROCESSING: "처리중",
  ANALYZING: "분석중",
  COMPLETED: "완료",
  FAILED: "실패",
  CANCELLED: "취소됨",
};

// 코드 설명: getLatestAnalysisJob 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getLatestAnalysisJob(report: Report): AnalysisJobWithMetrics | null {
  // 코드 설명: current 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const current = report as ReportWithAnalysisAliases;
  // 코드 설명: jobs 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const jobs = current.analysis_jobs ?? current.analysisJobs ?? [];

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    (current.latest_job as AnalysisJobWithMetrics | null | undefined) ??
    (current.latestJob as AnalysisJobWithMetrics | null | undefined) ??
    (current.latestAnalysisJob as AnalysisJobWithMetrics | null | undefined) ??
    (current.latest_analysis_job as AnalysisJobWithMetrics | null | undefined) ??
    (jobs[0] as AnalysisJobWithMetrics | undefined) ??
    null
  );
}

// 코드 설명: getReportAnalysisStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportAnalysisStatus(report: Report) {
  // 코드 설명: current 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const current = report as ReportWithAnalysisAliases;
  // 코드 설명: latestJob 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const latestJob = getLatestAnalysisJob(report);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    current.analysis_status ??
    current.analysisStatus ??
    current.ai_analysis_status ??
    latestJob?.job_status ??
    latestJob?.status ??
    null
  );
}

// 코드 설명: normalizeCount 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeCount(value: number | string | null | undefined) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value === null || value === undefined || value === ""
  if (value === null || value === undefined || value === "") return null;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String(value)
  return String(value);
}

// 코드 설명: getReportDetectionCount 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportDetectionCount(report: Report) {
  // 코드 설명: current 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const current = report as ReportWithAnalysisAliases;
  // 코드 설명: latestJob 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const latestJob = getLatestAnalysisJob(report);

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeCount( current.detection_count ?? current.detected_count ?? la…
  return normalizeCount(
    current.detection_count ??
    current.detected_count ??
    latestJob?.detection_count ??
    latestJob?.detected_count
  );
}

// 코드 설명: getReportProcessedFrames 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportProcessedFrames(report: Report) {
  // 코드 설명: current 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const current = report as ReportWithAnalysisAliases;
  // 코드 설명: latestJob 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const latestJob = getLatestAnalysisJob(report);

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeCount( current.processed_frames ?? current.processed_frame_cou…
  return normalizeCount(
    current.processed_frames ??
    current.processed_frame_count ??
    latestJob?.processed_frames ??
    latestJob?.processed_frame_count
  );
}

// 코드 설명: getReportRiskText 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportRiskText(report: Report) {
  // 코드 설명: latestJob 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const latestJob = getLatestAnalysisJob(report);
  // 코드 설명: riskLevel 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const riskLevel = report.risk_level ?? latestJob?.risk_level ?? null;
  // 코드 설명: riskScore 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const riskScore = report.risk_score ?? latestJob?.risk_score ?? null;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: riskLevel && riskScore !== null && riskScore !== undefined
  if (riskLevel && riskScore !== null && riskScore !== undefined) return `${riskLevel} (${riskScore})`;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: riskLevel
  if (riskLevel) return riskLevel;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: riskScore !== null && riskScore !== undefined
  if (riskScore !== null && riskScore !== undefined) return String(riskScore);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "-"
  return "-";
}

// 코드 설명: getBadgeTone 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getBadgeTone(value: string): "slate" | "blue" | "green" | "amber" | "red" {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["REJECTED", "DELETED", "URGENT", "HIGH", "CRITICAL"].includes(value)
  if (["REJECTED", "DELETED", "URGENT", "HIGH", "CRITICAL"].includes(value)) return "red";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["ANALYZING", "MEDIUM"].includes(value)
  if (["ANALYZING", "MEDIUM"].includes(value)) return "amber";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["CONVERTED_TO_INCIDENT", "COMPLETED", "LOW"].includes(value)
  if (["CONVERTED_TO_INCIDENT", "COMPLETED", "LOW"].includes(value)) return "green";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["REVIEWING", "REQUESTED", "NORMAL"].includes(value)
  if (["REVIEWING", "REQUESTED", "NORMAL"].includes(value)) return "blue";
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

// 코드 설명: toParams 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function toParams(filter: ReportFilter): ReportListParams {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { keyword: filter.keyword.trim() || undefined, status: filter.status ||…
  return {
    keyword: filter.keyword.trim() || undefined,
    status: filter.status || undefined,
    report_type: filter.report_type || undefined,
    priority: filter.priority || undefined,
    page: filter.page,
    size: filter.size,
  };
}

// 코드 설명: ReportsPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function ReportsPage() {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [filter, setFilter] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [filter, setFilter] = useState<ReportFilter>({ keyword: "", status: "", report_type: "", priority: "", page: 1, size: 10, mine: false });
  // 코드 설명: [draftKeyword, setDraftKeyword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [draftKeyword, setDraftKeyword] = useState("");
  // 코드 설명: [result, setResult] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [result, setResult] = useState<PaginatedReports>({ items: [], page: 1, size: 10, total_count: 0, total_pages: 0 });
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 코드 설명: [analyzingId, setAnalyzingId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  // 코드 설명: [bulkStatus, setBulkStatus] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [bulkStatus, setBulkStatus] = useState("REVIEWING");
  // 코드 설명: [bulkAction, setBulkAction] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [bulkAction, setBulkAction] = useState<"status" | null>(null);
  // 코드 설명: [selectedReportIds, setSelectedReportIds] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  // 코드 설명: selectAllRef 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  // 코드 설명: loadReports 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadReports(nextFilter = filter) {
    // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: params 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const params = toParams(nextFilter);
      // 코드 설명: nextResult 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextResult = nextFilter.mine ? await getMyReports(params) : await getReports({ ...params, mine: nextFilter.mine || undefined });
      // 코드 설명: setResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setResult(nextResult);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "신고 목록을 불러오지 못했습니다.");
      // 코드 설명: setResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setResult((current) => ({ ...current, items: [] }));
    } finally {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(false);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadReports();
    loadReports();
  }, [filter.keyword, filter.status, filter.report_type, filter.priority, filter.page, filter.size, filter.mine]);

  // 코드 설명: updateFilter 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function updateFilter(patch: Partial<ReportFilter>) {
    // 코드 설명: setFilter 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setFilter((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  // 코드 설명: handleSearch 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleSearch() {
    // 코드 설명: setFilter 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setFilter((current) => ({ ...current, keyword: draftKeyword, page: 1 }));
  }

  // 코드 설명: handleRequestAnalysis 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleRequestAnalysis(report: Report) {
    // 코드 설명: reportId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const reportId = getReportId(report);
    // 코드 설명: setAnalyzingId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAnalyzingId(reportId);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await requestReportAnalysis(reportId);
      await requestReportAnalysis(reportId);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadReports();
      await loadReports();
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "AI 분석 요청에 실패했습니다.");
    } finally {
      // 코드 설명: setAnalyzingId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setAnalyzingId(null);
    }
  }

  // 코드 설명: canOperateReports 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canOperateReports = authUser?.account_status?.toUpperCase() === "ACTIVE" && ["SUPER_ADMIN", "CONTROL_ADMIN"].includes(authUser.role ?? "");
  // 코드 설명: reports 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const reports = useMemo(() => result.items.filter((report) => getReportStatus(report) !== "DELETED"), [result.items]);
  // 코드 설명: canPrev 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canPrev = result.page > 1;
  // 코드 설명: canNext 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canNext = result.total_pages > 0 && result.page < result.total_pages;
  // 코드 설명: visibleReportIds 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const visibleReportIds = useMemo(() => reports.map(getReportId), [reports]);
  // 코드 설명: allVisibleSelected 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const allVisibleSelected = visibleReportIds.length > 0 && visibleReportIds.every((id) => selectedReportIds.has(id));
  // 코드 설명: someVisibleSelected 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const someVisibleSelected = visibleReportIds.some((id) => selectedReportIds.has(id));

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: selectAllRef.current
    if (selectAllRef.current) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: selectAllRef.current.indeterminate = someVisibleSelected && !allVisible…
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setSelectedReportIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedReportIds((current) => {
      // 코드 설명: visibleIds 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const visibleIds = new Set(visibleReportIds);
      // 코드 설명: next 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: next.size === current.size ? current : next
      return next.size === current.size ? current : next;
    });
  }, [visibleReportIds]);

  // 코드 설명: toggleAllReports 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function toggleAllReports(checked: boolean) {
    // 코드 설명: setSelectedReportIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedReportIds(checked ? new Set(visibleReportIds) : new Set());
  }

  // 코드 설명: toggleReport 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function toggleReport(reportId: string, checked: boolean) {
    // 코드 설명: setSelectedReportIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedReportIds((current) => {
      // 코드 설명: next 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const next = new Set(current);
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: checked
      if (checked) next.add(reportId);
      else next.delete(reportId);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: next
      return next;
    });
  }

  // 코드 설명: selectedReports 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const selectedReports = useMemo(
    () => reports.filter((report) => selectedReportIds.has(getReportId(report))),
    [reports, selectedReportIds]
  );
  // 코드 설명: selectedCompletedJobIds 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const selectedCompletedJobIds = useMemo(
    () => selectedReports
      .map((report) => {
        // 코드 설명: job 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const job = getLatestAnalysisJob(report);
        // 코드 설명: status 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const status = job?.job_status ?? job?.status;
        // 코드 설명: jobId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const jobId = job?.analysis_job_id ?? job?.id;
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: status === "COMPLETED" && jobId !== null && jobId !== undefined ? Strin…
        return status === "COMPLETED" && jobId !== null && jobId !== undefined ? String(jobId) : null;
      })
      .filter((jobId): jobId is string => Boolean(jobId)),
    [selectedReports]
  );
  // 코드 설명: canCompareSelected 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canCompareSelected = selectedCompletedJobIds.length >= 2 && selectedCompletedJobIds.length <= 5;

  // 코드 설명: handleBulkStatusChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleBulkStatusChange() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canOperateReports || selectedReports.length === 0
    if (!canOperateReports || selectedReports.length === 0) return;
    // 코드 설명: setBulkAction 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setBulkAction("status");
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: results 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const results = await Promise.allSettled(selectedReports.map((report) => (
      updateReportStatus(getReportId(report), {
        status: bulkStatus,
        reason: `목록에서 ${bulkStatus} 상태로 일괄 변경`,
      })
    )));
    // 코드 설명: succeededIds 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const succeededIds = new Set(
      selectedReports
        .filter((_, index) => results[index]?.status === "fulfilled")
        .map(getReportId)
    );

    // 코드 설명: setResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setResult((current) => ({
      ...current,
      items: current.items.map((report) => (
        succeededIds.has(getReportId(report)) ? { ...report, status: bulkStatus } : report
      )),
    }));
    // 코드 설명: setSelectedReportIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedReportIds(new Set());
    // 코드 설명: setBulkAction 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setBulkAction(null);

    // 코드 설명: failedCount 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const failedCount = results.length - succeededIds.size;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: failedCount > 0
    if (failedCount > 0) setErrorMessage(`${failedCount}건의 신고 상태를 변경하지 못했습니다.`);
  }

  // 코드 설명: handleBulkAnalysis 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleBulkAnalysis() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canOperateReports || selectedReports.length === 0
    if (!canOperateReports || selectedReports.length === 0) return;
    // 코드 설명: query 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
    const query = new URLSearchParams({
      reportIds: selectedReports.map(getReportId).join(","),
    });
    // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
    router.push(`/reports/analysis-request?${query.toString()}`);
  }

  // 코드 설명: handleCompareSelected 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleCompareSelected() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canCompareSelected
    if (!canCompareSelected) return;
    // 코드 설명: query 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
    const query = new URLSearchParams({
      selectedJobIds: selectedCompletedJobIds.join(","),
      selectedJobId: selectedCompletedJobIds[0],
    });
    // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
    router.push(`/reports/analysis-comparisons?${query.toString()}`);
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <AppLayout title="신고 목록">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">신고 목록</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">신고 목록과 분석 요청 상태를 조회합니다.</p>
          </div>
          <Link href="/reports/create" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white no-underline transition hover:bg-staccato-dark">
            <Upload className="h-4 w-4" aria-hidden="true" />
            신고 등록
          </Link>
        </section>

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto_auto] xl:items-center">
            <div className="relative flex gap-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={draftKeyword}
                onChange={(event) => setDraftKeyword(event.target.value)}
                onKeyDown={(event) => {
                  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: event.key === "Enter"
                  if (event.key === "Enter") handleSearch();
                }}
                placeholder="제목, 위치, 코드 검색"
                className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
              />
              <button type="button" onClick={handleSearch} className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">검색</button>
            </div>
            <select value={filter.status} onChange={(event) => updateFilter({ status: event.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={filter.report_type} onChange={(event) => updateFilter({ report_type: event.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={filter.priority} onChange={(event) => updateFilter({ priority: event.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={filter.mine} onChange={(event) => updateFilter({ mine: event.target.checked })} className="h-4 w-4" />
              내 신고만
            </label>
          </div>
        </section>

        {errorMessage && !loading && result.items.length === 0 ? (
          <ErrorPage statusCode={500} title="신고 목록을 불러오지 못했습니다" description={errorMessage} actionLabel="다시 시도" actionHref={undefined} onAction={() => loadReports()} secondaryActionLabel="대시보드로 이동" secondaryActionHref="/dashboard" />
        ) : null}
        {errorMessage && result.items.length > 0 ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        {!(errorMessage && !loading && result.items.length === 0) ? <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-700">{loading ? "불러오는 중" : `${result.total_count || reports.length}건 · ${selectedReportIds.size}건 선택`}</span>
            <div className="flex items-center gap-2">
              <select value={filter.size} onChange={(event) => updateFilter({ size: Number(event.target.value) })} className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700">
                {[10, 20, 50].map((size) => <option key={size} value={size}>{size}개</option>)}
              </select>
              <button type="button" onClick={() => loadReports()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">새로고침</button>
            </div>
          </div>
          {selectedReportIds.size > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-sky-50/70 px-4 py-3">
              <span className="text-sm font-black text-sky-800">{selectedReportIds.size}건 선택됨</span>
              <div className="flex flex-wrap items-center gap-2">
                {canOperateReports ? (
                  <>
                    <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} disabled={bulkAction !== null} aria-label="선택 신고 변경 상태" className="h-9 rounded-lg border border-sky-200 bg-white px-3 text-xs font-bold text-sky-800 disabled:opacity-50">
                      {reportStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <button type="button" onClick={handleBulkStatusChange} disabled={bulkAction !== null} className="h-9 rounded-lg bg-sky-700 px-3 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-50">
                      {bulkAction === "status" ? "변경 중" : "선택 상태 변경"}
                    </button>
                    <button type="button" onClick={handleBulkAnalysis} disabled={bulkAction !== null} className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
                      선택 분석 요청
                    </button>
                  </>
                ) : null}
                <button type="button" onClick={handleCompareSelected} disabled={!canCompareSelected || bulkAction !== null} title={canCompareSelected ? undefined : "완료된 분석 Job이 있는 신고를 2~5개 선택해 주세요."} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  선택 비교분석 ({selectedCompletedJobIds.length})
                </button>
              </div>
            </div>
          ) : null}
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-11 px-2 py-3 text-center"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllReports(event.target.checked)} aria-label="현재 신고 전체 선택" className="h-4 w-4 rounded border-slate-300" /></th>
                  <th className="w-[18%] px-2 py-3">제목</th>
                  <th className="w-[10%] px-2 py-3">신고 유형</th>
                  <th className="w-[8%] px-2 py-3">상태</th>
                  <th className="w-[8%] px-2 py-3">우선순위</th>
                  <th className="w-[8%] px-2 py-3">위험도</th>
                  <th className="w-[11%] px-2 py-3">AI 분석</th>
                  <th className="w-[12%] px-2 py-3">등록일</th>
                  <th className="w-[220px] px-2 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  // 코드 설명: status 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const status = getReportStatus(report);
                  // 코드 설명: priority 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const priority = getReportPriority(report);
                  // 코드 설명: type 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const type = getReportType(report);
                  // 코드 설명: analysisStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const analysisStatus = getReportAnalysisStatus(report);
                  // 코드 설명: detectionCount 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const detectionCount = getReportDetectionCount(report);
                  // 코드 설명: processedFrames 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const processedFrames = getReportProcessedFrames(report);
                  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
                  return (
                    <tr key={getReportId(report)} className="border-t border-slate-100">
                      <td className="px-2 py-4 text-center">
                        <input type="checkbox" checked={selectedReportIds.has(getReportId(report))} onChange={(event) => toggleReport(getReportId(report), event.target.checked)} aria-label={getReportTitle(report) + " 선택"} className="h-4 w-4 rounded border-slate-300" />
                      </td>
                      <td className="min-w-0 px-2 py-4">
                        <b className="block truncate text-slate-950" title={getReportTitle(report)}>{getReportTitle(report)}</b>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-400">{getReportCode(report)} · {getReportLocation(report)}</p>
                      </td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-600" title={typeLabels[type] ?? type}>{typeLabels[type] ?? type}</td>
                      <td className="truncate whitespace-nowrap px-2 py-4"><Badge tone={getBadgeTone(status)}>{statusLabels[status] ?? status}</Badge></td>
                      <td className="truncate whitespace-nowrap px-2 py-4"><Badge tone={getBadgeTone(priority)}>{priorityLabels[priority] ?? priority}</Badge></td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-600">{getReportRiskText(report)}</td>
                      <td className="min-w-0 px-2 py-4">
                        {analysisStatus ? (
                          <div className="space-y-1">
                            <Badge tone={getBadgeTone(analysisStatus)}>{analysisStatusLabels[analysisStatus] ?? analysisStatus}</Badge>
                            {detectionCount || processedFrames ? (
                              <p className="text-xs font-semibold text-slate-400">
                                {detectionCount ? `감지 ${detectionCount}건` : null}
                                {detectionCount && processedFrames ? " · " : null}
                                {processedFrames ? `프레임 ${processedFrames}` : null}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">-</span>
                        )}
                      </td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-500" title={formatDateTime(getReportCreatedAt(report))}>{formatDateTime(getReportCreatedAt(report))}</td>
                      <td className="px-2 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Link href={`/reports/${getReportId(report)}`} className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">상세 보기</Link>
                          <Link href={`/reports/analysis-comparisons?report_id=${getReportId(report)}`} className="inline-flex h-8 items-center rounded-lg border border-sky-200 px-2 text-xs font-bold text-sky-700 no-underline transition hover:bg-sky-50">비교분석</Link>
                          {canOperateReports ? <button type="button" onClick={() => handleRequestAnalysis(report)} disabled={analyzingId === getReportId(report)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            분석
                          </button> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && reports.length === 0 ? <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">조건에 맞는 신고 등록 내역이 없습니다.</p> : null}
          {result.total_pages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <button type="button" disabled={!canPrev} onClick={() => updateFilter({ page: filter.page - 1 })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">이전</button>
              <span className="text-xs font-bold text-slate-500">{result.page} / {result.total_pages}</span>
              <button type="button" disabled={!canNext} onClick={() => updateFilter({ page: filter.page + 1 })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">다음</button>
            </div>
          ) : null}
        </section> : null}
      </AppLayout>
    </RequireAuth>
  );
}
