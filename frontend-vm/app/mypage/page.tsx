/**
 * 파일 역할: 마이페이지 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/mypage/PendingApprovalMyPage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { PendingApprovalMyPage } from "@/components/mypage/PendingApprovalMyPage";
// 코드 설명: @/components/mypage/ProfileSummary 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ProfileSummary } from "@/components/mypage/ProfileSummary";
// 코드 설명: @/components/mypage/SecurityCard 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { SecurityCard } from "@/components/mypage/SecurityCard";
// 코드 설명: @/components/mypage/ControlAdminMyPage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ControlAdminMyPage } from "@/components/mypage/ControlAdminMyPage";
// 코드 설명: @/components/mypage/SuperAdminMyPage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { SuperAdminMyPage } from "@/components/mypage/SuperAdminMyPage";
// 코드 설명: @/features/reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getMyReportDrafts, getMyReports, getReportDraft } from "@/features/reports/api";
// 코드 설명: @/features/bug-reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getMyBugReports } from "@/features/bug-reports/api";
// 코드 설명: @/features/reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Report, ReportDraft } from "@/features/reports/types";
// 코드 설명: @/features/bug-reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { BugReport } from "@/features/bug-reports/types";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { clearStoredAuth, getStoredAuthUser } from "@/lib/authStorage";

// 코드 설명: statusLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusLabels: Record<string, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토중",
  ANALYZING: "분석중",
  CONVERTED_TO_INCIDENT: "이벤트 전환",
  REJECTED: "반려",
  CLOSED: "종료",
  DRAFT: "임시저장",
};

// 코드 설명: priorityLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const priorityLabels: Record<string, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  MEDIUM: "중간",
  HIGH: "높음",
  URGENT: "긴급",
};

// 코드 설명: bugStatusLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const bugStatusLabels: Record<string, string> = {
  OPEN: "접수",
  TRIAGED: "분류됨",
  IN_PROGRESS: "처리중",
  RESOLVED: "해결",
  CLOSED: "종료",
  REJECTED: "반려",
  DUPLICATE: "중복",
};

// 코드 설명: severityLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const severityLabels: Record<string, string> = {
  BLOCKER: "차단",
  CRITICAL: "치명",
  MAJOR: "주요",
  MINOR: "경미",
  TRIVIAL: "사소",
};

// 코드 설명: RoleContent 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function RoleContent({ user }: { user: AuthUser | null }) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: user?.account_status?.toUpperCase() === "PENDING"
  if (user?.account_status?.toUpperCase() === "PENDING") {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return <PendingApprovalMyPage user={user} />;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: user?.role === "SUPER_ADMIN"
  if (user?.role === "SUPER_ADMIN") {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return <SuperAdminMyPage />;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: user?.role === "CONTROL_ADMIN"
  if (user?.role === "CONTROL_ADMIN") {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return <ControlAdminMyPage />;
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">계정 확인 필요</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        /auth/me 응답의 계정 정보를 확인할 수 없습니다. 관리자에게 문의해주세요.
      </p>
    </section>
  );
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
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

// 코드 설명: getReportTitle 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportTitle(report: Report | ReportDraft) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.title ?? report.subject ?? "제목 없음"
  return report.title ?? report.subject ?? "제목 없음";
}

// 코드 설명: getDraftId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getDraftId(draft: ReportDraft) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: draft.draft_id ?? draft.id
  return draft.draft_id ?? draft.id;
}

// 코드 설명: getReportType 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportType(report: ReportDraft) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.report_type ?? report.reportType ?? "GENERAL"
  return report.report_type ?? report.reportType ?? "GENERAL";
}

// 코드 설명: getBugAttachmentCount 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getBugAttachmentCount(report: BugReport) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.attachments?.length ?? report.attachment_count ?? 0
  return report.attachments?.length ?? report.attachment_count ?? 0;
}

// 코드 설명: ReportActivitySection 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function ReportActivitySection() {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [reports, setReports] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [reports, setReports] = useState<Report[]>([]);
  // 코드 설명: [drafts, setDrafts] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [drafts, setDrafts] = useState<ReportDraft[]>([]);
  // 코드 설명: [bugReports, setBugReports] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  // 코드 설명: [loadingReports, setLoadingReports] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loadingReports, setLoadingReports] = useState(true);
  // 코드 설명: [loadingDrafts, setLoadingDrafts] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  // 코드 설명: [loadingBugReports, setLoadingBugReports] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loadingBugReports, setLoadingBugReports] = useState(true);
  // 코드 설명: [loadingDraftId, setLoadingDraftId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);
  // 코드 설명: [reportsError, setReportsError] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [reportsError, setReportsError] = useState("");
  // 코드 설명: [draftsError, setDraftsError] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [draftsError, setDraftsError] = useState("");
  // 코드 설명: [bugReportsError, setBugReportsError] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [bugReportsError, setBugReportsError] = useState("");
  // 코드 설명: [bugStatus, setBugStatus] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [bugStatus, setBugStatus] = useState("");
  // 코드 설명: [bugSeverity, setBugSeverity] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [bugSeverity, setBugSeverity] = useState("");
  // 코드 설명: [bugKeyword, setBugKeyword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [bugKeyword, setBugKeyword] = useState("");
  // 코드 설명: [bugKeywordDraft, setBugKeywordDraft] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [bugKeywordDraft, setBugKeywordDraft] = useState("");

  // 코드 설명: loadMyReports 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadMyReports() {
    // 코드 설명: setLoadingReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoadingReports(true);
    // 코드 설명: setReportsError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setReportsError("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await getMyReports({ page: 1, size: 5 });
      // 코드 설명: setReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReports(response.items);
    } catch {
      // 코드 설명: setReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReports([]);
      // 코드 설명: setReportsError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReportsError("내 신고글을 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setLoadingReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoadingReports(false);
    }
  }

  // 코드 설명: loadDrafts 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadDrafts() {
    // 코드 설명: setLoadingDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoadingDrafts(true);
    // 코드 설명: setDraftsError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDraftsError("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await getMyReportDrafts({ page: 1, size: 10 });
      // 코드 설명: setDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDrafts(response.items);
    } catch {
      // 코드 설명: setDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDrafts([]);
      // 코드 설명: setDraftsError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDraftsError("임시저장 신고글을 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setLoadingDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoadingDrafts(false);
    }
  }

  // 코드 설명: loadBugReports 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadBugReports(params: { status?: string; severity?: string; keyword?: string } = {}) {
    // 코드 설명: setLoadingBugReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoadingBugReports(true);
    // 코드 설명: setBugReportsError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setBugReportsError("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await getMyBugReports({ page: 1, size: 10, ...params });
      // 코드 설명: currentUser 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const currentUser = getStoredAuthUser();
      // 코드 설명: ownItems 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const ownItems = currentUser?.id === undefined
        ? []
        : response.items.filter((item) => String(item.reporter_id ?? item.author_id ?? item.user_id) === String(currentUser.id));
      // 코드 설명: setBugReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setBugReports(ownItems);
    } catch {
      // 코드 설명: setBugReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setBugReports([]);
      // 코드 설명: setBugReportsError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setBugReportsError("내 버그 리포트 목록을 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setLoadingBugReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoadingBugReports(false);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadMyReports();
    loadMyReports();
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadDrafts();
    loadDrafts();
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadBugReports();
    loadBugReports();
  }, []);

  // 코드 설명: handleBugSearch 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleBugSearch() {
    // 코드 설명: keyword 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const keyword = bugKeywordDraft.trim();
    // 코드 설명: setBugKeyword 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setBugKeyword(keyword);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadBugReports({ status: bugStatus, severity: bugSeverity, keyword });
    loadBugReports({ status: bugStatus, severity: bugSeverity, keyword });
  }

  // 코드 설명: handleBugStatusChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleBugStatusChange(value: string) {
    // 코드 설명: setBugStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setBugStatus(value);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadBugReports({ status: value, severity: bugSeverity, keyword: bugKeyw…
    loadBugReports({ status: value, severity: bugSeverity, keyword: bugKeyword });
  }

  // 코드 설명: handleBugSeverityChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleBugSeverityChange(value: string) {
    // 코드 설명: setBugSeverity 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setBugSeverity(value);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadBugReports({ status: bugStatus, severity: value, keyword: bugKeywor…
    loadBugReports({ status: bugStatus, severity: value, keyword: bugKeyword });
  }

  // 코드 설명: handleOpenDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleOpenDraft(draft: ReportDraft) {
    // 코드 설명: draftId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const draftId = getDraftId(draft);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !draftId
    if (!draftId) return;

    // 코드 설명: setLoadingDraftId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoadingDraftId(String(draftId));
    // 코드 설명: setDraftsError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDraftsError("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: detail 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const detail = await getReportDraft(draftId);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.sessionStorage.setItem("staccato:reportDraftToLoad", JSON.string…
      window.sessionStorage.setItem("staccato:reportDraftToLoad", JSON.stringify({ draftId, draft: detail }));
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.push("/reports/create?draftId=" + encodeURIComponent(String(draftId)));
    } catch {
      // 코드 설명: setDraftsError 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDraftsError("임시저장 신고를 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setLoadingDraftId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoadingDraftId(null);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">내 신고글</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">최근 제출한 신고를 확인합니다.</p>
            </div>
            <Link href="/reports?mine=true" className="text-sm font-black text-sky-700 no-underline hover:text-sky-900">전체 보기</Link>
          </div>

          {loadingReports ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">내 신고글을 불러오는 중입니다.</p> : null}
          {!loadingReports && reportsError ? <p className="rounded-lg bg-red-50 p-4 text-sm font-bold text-red-700">{reportsError}</p> : null}
          {!loadingReports && !reportsError && reports.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">제출한 신고글이 없습니다.</p> : null}

          {!loadingReports && !reportsError && reports.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {reports.map((report) => (
                <li key={String(report.id)}>
                  <Link href={"/reports/" + report.id} className="block py-3 no-underline transition hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{getReportTitle(report)}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(report.submitted_at ?? report.created_at)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-black text-slate-700">{statusLabels[report.status ?? ""] ?? report.status ?? "접수"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{priorityLabels[report.priority ?? ""] ?? report.priority ?? "보통"}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">임시저장 신고글</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">작성 중인 신고를 이어서 작성합니다.</p>
            </div>
            <Link href="/reports/create" className="text-sm font-black text-sky-700 no-underline hover:text-sky-900">신고 작성</Link>
          </div>

          {loadingDrafts ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">임시저장을 불러오는 중입니다.</p> : null}
          {!loadingDrafts && draftsError ? <p className="rounded-lg bg-red-50 p-4 text-sm font-bold text-red-700">{draftsError}</p> : null}
          {!loadingDrafts && !draftsError && drafts.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">임시저장 신고글이 없습니다.</p> : null}

          {!loadingDrafts && !draftsError && drafts.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {drafts.map((draft) => {
                // 코드 설명: draftId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                const draftId = getDraftId(draft);
                // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
                return (
                  <li key={String(draftId ?? draft.title)}>
                    <button type="button" onClick={() => handleOpenDraft(draft)} disabled={!draftId || loadingDraftId === String(draftId)} className="block w-full py-3 text-left transition hover:bg-slate-50 disabled:opacity-60">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">{getReportTitle(draft)}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{getReportType(draft)} · {formatDate(draft.updated_at ?? draft.created_at)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-black text-slate-700">{priorityLabels[draft.priority ?? ""] ?? draft.priority ?? "보통"}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{loadingDraftId === String(draftId) ? "불러오는 중" : "이어쓰기"}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">내 버그 리포트</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">내가 등록한 문의와 오류 제보를 확인합니다.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[140px_140px_minmax(180px,1fr)_auto]">
            <select value={bugStatus} onChange={(event) => handleBugStatusChange(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
              <option value="">상태 전체</option>
              <option value="OPEN">접수</option>
              <option value="TRIAGED">분류됨</option>
              <option value="IN_PROGRESS">처리중</option>
              <option value="RESOLVED">해결</option>
              <option value="CLOSED">종료</option>
              <option value="REJECTED">반려</option>
              <option value="DUPLICATE">중복</option>
            </select>
            <select value={bugSeverity} onChange={(event) => handleBugSeverityChange(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
              <option value="">심각도 전체</option>
              <option value="BLOCKER">차단</option>
              <option value="CRITICAL">치명</option>
              <option value="MAJOR">주요</option>
              <option value="MINOR">경미</option>
              <option value="TRIVIAL">사소</option>
            </select>
            <input value={bugKeywordDraft} onChange={(event) => setBugKeywordDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleBugSearch(); }} placeholder="제목, 설명, 페이지 검색" className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 outline-none focus:border-sky-400" />
            <button type="button" onClick={handleBugSearch} className="h-10 rounded-lg bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800">검색</button>
          </div>
        </div>

        {loadingBugReports ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">내 버그 리포트를 불러오는 중입니다.</p> : null}
        {!loadingBugReports && bugReportsError ? <p className="rounded-lg bg-red-50 p-4 text-sm font-bold text-red-700">{bugReportsError}</p> : null}
        {!loadingBugReports && !bugReportsError && bugReports.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">등록한 버그 리포트가 없습니다.</p> : null}

        {!loadingBugReports && !bugReportsError && bugReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">심각도</th>
                  <th className="px-4 py-3">우선순위</th>
                  <th className="px-4 py-3">카테고리</th>
                  <th className="px-4 py-3">발생 페이지</th>
                  <th className="px-4 py-3">첨부</th>
                  <th className="px-4 py-3">작성일</th>
                  <th className="px-4 py-3">수정일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bugReports.map((bugReport) => (
                  <tr key={String(bugReport.id)} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={"/bug-reports/" + bugReport.id} className="block max-w-[260px] truncate font-black text-slate-900 no-underline hover:text-sky-700">{bugReport.title || "제목 없음"}</Link>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">{bugStatusLabels[bugReport.status ?? ""] ?? bugReport.status ?? "접수"}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{severityLabels[bugReport.severity ?? ""] ?? bugReport.severity ?? "경미"}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{priorityLabels[bugReport.priority ?? ""] ?? bugReport.priority ?? "보통"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{bugReport.category ?? "GENERAL"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600"><span className="block max-w-[180px] truncate">{bugReport.page_url ?? "-"}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{getBugAttachmentCount(bugReport)}개</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{formatDate(bugReport.created_at)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{formatDate(bugReport.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

// 코드 설명: MyPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function MyPage() {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
  }, []);

  // 코드 설명: handleLogout 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleLogout() {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: clearStoredAuth();
    clearStoredAuth();
    // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
    router.replace("/login");
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <AppLayout title="마이페이지">
        <section className="mx-auto grid w-full max-w-[1200px] gap-5">
          <div>
            <p className="text-sm font-bold tracking-[0.18em] text-sky-600">
              MY PAGE
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              마이페이지
            </h2>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div className="grid content-start gap-5">
              <ProfileSummary user={authUser} />
              <SecurityCard onLogout={handleLogout} />
            </div>
            <RoleContent user={authUser} />
          </div>

          <ReportActivitySection />
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
