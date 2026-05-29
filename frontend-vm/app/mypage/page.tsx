"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PendingApprovalMyPage } from "@/components/mypage/PendingApprovalMyPage";
import { ProfileSummary } from "@/components/mypage/ProfileSummary";
import { SecurityCard } from "@/components/mypage/SecurityCard";
import { ControlAdminMyPage } from "@/components/mypage/ControlAdminMyPage";
import { SuperAdminMyPage } from "@/components/mypage/SuperAdminMyPage";
import { getMyReportDrafts, getMyReports, getReportDraft } from "@/features/reports/api";
import { getMyBugReports } from "@/features/bug-reports/api";
import type { Report, ReportDraft } from "@/features/reports/types";
import type { BugReport } from "@/features/bug-reports/types";
import type { AuthUser } from "@/features/auth/types";
import { clearStoredAuth, getStoredAuthUser } from "@/lib/authStorage";

const statusLabels: Record<string, string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토중",
  ANALYZING: "분석중",
  CONVERTED_TO_INCIDENT: "이벤트 전환",
  REJECTED: "반려",
  CLOSED: "종료",
  DRAFT: "임시저장",
};

const priorityLabels: Record<string, string> = {
  LOW: "낮음",
  NORMAL: "보통",
  MEDIUM: "중간",
  HIGH: "높음",
  URGENT: "긴급",
};

const bugStatusLabels: Record<string, string> = {
  OPEN: "접수",
  TRIAGED: "분류됨",
  IN_PROGRESS: "처리중",
  RESOLVED: "해결",
  CLOSED: "종료",
  REJECTED: "반려",
  DUPLICATE: "중복",
};

const severityLabels: Record<string, string> = {
  BLOCKER: "차단",
  CRITICAL: "치명",
  MAJOR: "주요",
  MINOR: "경미",
  TRIVIAL: "사소",
};

function RoleContent({ user }: { user: AuthUser | null }) {
  if (user?.account_status?.toUpperCase() === "PENDING") {
    return <PendingApprovalMyPage user={user} />;
  }

  if (user?.role === "SUPER_ADMIN") {
    return <SuperAdminMyPage />;
  }

  if (user?.role === "CONTROL_ADMIN") {
    return <ControlAdminMyPage />;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">계정 확인 필요</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        /auth/me 응답의 계정 정보를 확인할 수 없습니다. 관리자에게 문의해주세요.
      </p>
    </section>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function getReportTitle(report: Report | ReportDraft) {
  return report.title ?? report.subject ?? "제목 없음";
}

function getDraftId(draft: ReportDraft) {
  return draft.draft_id ?? draft.id;
}

function getReportType(report: ReportDraft) {
  return report.report_type ?? report.reportType ?? "GENERAL";
}

function getBugAttachmentCount(report: BugReport) {
  return report.attachments?.length ?? report.attachment_count ?? 0;
}

function ReportActivitySection() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [drafts, setDrafts] = useState<ReportDraft[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [loadingBugReports, setLoadingBugReports] = useState(true);
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);
  const [reportsError, setReportsError] = useState("");
  const [draftsError, setDraftsError] = useState("");
  const [bugReportsError, setBugReportsError] = useState("");
  const [bugStatus, setBugStatus] = useState("");
  const [bugSeverity, setBugSeverity] = useState("");
  const [bugKeyword, setBugKeyword] = useState("");
  const [bugKeywordDraft, setBugKeywordDraft] = useState("");

  async function loadMyReports() {
    setLoadingReports(true);
    setReportsError("");

    try {
      const response = await getMyReports({ page: 1, size: 5 });
      setReports(response.items);
    } catch {
      setReports([]);
      setReportsError("내 신고글을 불러오지 못했습니다.");
    } finally {
      setLoadingReports(false);
    }
  }

  async function loadDrafts() {
    setLoadingDrafts(true);
    setDraftsError("");

    try {
      const response = await getMyReportDrafts({ page: 1, size: 10 });
      setDrafts(response.items);
    } catch {
      setDrafts([]);
      setDraftsError("임시저장 신고글을 불러오지 못했습니다.");
    } finally {
      setLoadingDrafts(false);
    }
  }

  async function loadBugReports(params: { status?: string; severity?: string; keyword?: string } = {}) {
    setLoadingBugReports(true);
    setBugReportsError("");

    try {
      const response = await getMyBugReports({ page: 1, size: 10, ...params });
      setBugReports(response.items);
    } catch {
      setBugReports([]);
      setBugReportsError("내 버그 리포트 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingBugReports(false);
    }
  }

  useEffect(() => {
    loadMyReports();
    loadDrafts();
    loadBugReports();
  }, []);

  function handleBugSearch() {
    const keyword = bugKeywordDraft.trim();
    setBugKeyword(keyword);
    loadBugReports({ status: bugStatus, severity: bugSeverity, keyword });
  }

  function handleBugStatusChange(value: string) {
    setBugStatus(value);
    loadBugReports({ status: value, severity: bugSeverity, keyword: bugKeyword });
  }

  function handleBugSeverityChange(value: string) {
    setBugSeverity(value);
    loadBugReports({ status: bugStatus, severity: value, keyword: bugKeyword });
  }

  async function handleOpenDraft(draft: ReportDraft) {
    const draftId = getDraftId(draft);
    if (!draftId) return;

    setLoadingDraftId(String(draftId));
    setDraftsError("");

    try {
      const detail = await getReportDraft(draftId);
      window.sessionStorage.setItem("staccato:reportDraftToLoad", JSON.stringify({ draftId, draft: detail }));
      router.push("/reports/create?draftId=" + encodeURIComponent(String(draftId)));
    } catch {
      setDraftsError("임시저장 신고를 불러오지 못했습니다.");
    } finally {
      setLoadingDraftId(null);
    }
  }

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
                const draftId = getDraftId(draft);
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

export default function MyPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  function handleLogout() {
    clearStoredAuth();
    router.replace("/login");
  }

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
