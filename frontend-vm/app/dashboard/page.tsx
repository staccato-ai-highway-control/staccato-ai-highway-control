/**
 * 파일 역할: 대시보드 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useState } from "react";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AlertTriangle, Bell, CheckCircle2, Clock3, Cctv, FileText, ShieldAlert, UserCheck, Users } from "lucide-react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/dashboard/DashboardPanel 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
// 코드 설명: @/components/notifications/RealtimePreviewToast 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RealtimePreviewToast } from "@/components/notifications/RealtimePreviewToast";
// 코드 설명: @/components/incident/IncidentStatusBadge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
// 코드 설명: @/components/incident/RiskLevelBadge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/features/cctvs/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getCctvs } from "@/features/cctvs/api";
// 코드 설명: @/features/cctvs/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Cctv as CctvItem } from "@/features/cctvs/types";
// 코드 설명: @/features/dashboard/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getDashboardSummary, type DashboardSummary } from "@/features/dashboard/api";
// 코드 설명: @/features/incidents/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getIncidents } from "@/features/incidents/api";
// 코드 설명: @/features/incidents/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { incidentTypeLabels, type Incident } from "@/features/incidents/types";
// 코드 설명: @/features/reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getReports } from "@/features/reports/api";
// 코드 설명: @/features/reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Report } from "@/features/reports/types";
// 코드 설명: @/features/realtime/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getRealtimeEventPreviews } from "@/features/realtime/api";
// 코드 설명: @/features/realtime/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { RealtimeEventPreview } from "@/features/realtime/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";

// 코드 설명: LoadState 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type LoadState<T> = { status: "loading" } | { status: "success"; data: T } | { status: "error"; message: string };
// 코드 설명: StatCard 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type StatCard = { label: string; value: string; helper: string; tone: string; bg: string; icon: typeof AlertTriangle };

// 코드 설명: errorMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function errorMessage(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback; }
// 코드 설명: isUnresolvedIncident 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isUnresolvedIncident(incident: Incident) { return !["RESOLVED", "CLOSED", "FALSE_POSITIVE"].includes(incident.status); }
// 코드 설명: getReportTitle 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportTitle(report: Report) { return report.title ?? report.subject ?? "제목 없음"; }
// 코드 설명: getReportCode 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportCode(report: Report) { return report.report_code ?? report.reportCode ?? `#${report.id}`; }
// 코드 설명: getReportLocation 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportLocation(report: Report) { return report.location ?? report.address ?? report.place_name ?? report.locationName ?? "-"; }
// 코드 설명: getReportAnalysisStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportAnalysisStatus(report: Report) { return report.analysis_status ?? report.analysisStatus ?? "WAITING"; }

// 코드 설명: SectionState 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function SectionState({ state, loadingText, children }: { state: LoadState<unknown>; loadingText: string; children: React.ReactNode }) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: state.status === "loading"
  if (state.status === "loading") return <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">{loadingText}</p>;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: state.status === "error"
  if (state.status === "error") return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700"><b className="block">데이터를 불러오지 못했습니다.</b><span className="mt-1 block">{state.message}</span></div>;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: <>{children}</>
  return <>{children}</>;
}

// 코드 설명: StatGrid 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function StatGrid({ cards }: { cards: StatCard[] }) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map((card) => { const Icon = card.icon; return <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-lg ${card.bg}`}><Icon className={`h-5 w-5 ${card.tone}`} aria-hidden="true" /></span><span className="text-xs font-medium text-slate-400">{card.helper}</span></div><strong className="mt-5 block text-3xl font-black text-slate-950">{card.value}</strong><p className="mt-1 text-sm font-medium text-slate-500">{card.label}</p></article>; })}</section>;
}

// 코드 설명: IncidentRows 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function IncidentRows({ incidents }: { incidents: Incident[] }) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !incidents.length
  if (!incidents.length) return <p className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">최근 이벤트가 없습니다.</p>;
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return <div className="grid gap-3">{incidents.map((incident) => <Link key={incident.id} href={`/incidents/${incident.id}`} className="grid gap-3 rounded-lg border border-slate-100 p-4 text-slate-900 no-underline transition hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center"><div className="min-w-0"><b className="block truncate text-sm text-slate-950">{incident.title}</b><p className="mt-1 text-xs font-semibold text-slate-500">{incidentTypeLabels[incident.eventType]} · {incident.location}</p></div><RiskLevelBadge level={incident.riskLevel} /><IncidentStatusBadge status={incident.status} /></Link>)}</div>;
}

// 코드 설명: ReportRows 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function ReportRows({ reports }: { reports: Report[] }) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !reports.length
  if (!reports.length) return <p className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">최근 신고가 없습니다.</p>;
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return <div className="grid gap-3">{reports.map((report) => <Link key={report.id} href={`/reports/${report.id}`} className="rounded-lg border border-slate-100 p-4 text-slate-900 no-underline transition hover:bg-slate-50"><b className="block truncate text-sm text-slate-950">{getReportTitle(report)}</b><p className="mt-1 text-xs font-semibold text-slate-500">{getReportCode(report)} · {report.status ?? "SUBMITTED"} · {getReportLocation(report)}</p></Link>)}</div>;
}

// 코드 설명: CctvStatusGrid 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function CctvStatusGrid({ cctvs }: { cctvs: CctvItem[] }) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !cctvs.length
  if (!cctvs.length) return <p className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">등록된 CCTV가 없습니다.</p>;
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return <div className="grid grid-cols-3 gap-3">{(["ONLINE", "OFFLINE", "MAINTENANCE"] as const).map((status) => { const count = cctvs.filter((cctv) => cctv.status === status).length; return <div key={status} className="rounded-lg border border-slate-100 p-4 text-center"><Cctv className="mx-auto h-5 w-5 text-slate-500" aria-hidden="true" /><strong className="mt-3 block text-2xl font-black text-slate-950">{count}</strong><p className="mt-1"><Badge tone={status === "ONLINE" ? "green" : status === "OFFLINE" ? "red" : "amber"}>{status}</Badge></p></div>; })}</div>;
}

// 코드 설명: DashboardPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function DashboardPage() {
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [summaryState, setSummaryState] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [summaryState, setSummaryState] = useState<LoadState<DashboardSummary>>({ status: "loading" });
  // 코드 설명: [incidentState, setIncidentState] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [incidentState, setIncidentState] = useState<LoadState<Incident[]>>({ status: "loading" });
  // 코드 설명: [reportState, setReportState] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [reportState, setReportState] = useState<LoadState<Report[]>>({ status: "loading" });
  // 코드 설명: [cctvState, setCctvState] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [cctvState, setCctvState] = useState<LoadState<CctvItem[]>>({ status: "loading" });
  // 코드 설명: [previewEvent, setPreviewEvent] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [previewEvent, setPreviewEvent] = useState<RealtimeEventPreview | null>(null);
  // 코드 설명: [isPreviewOpen, setIsPreviewOpen] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // 코드 설명: [isPreviewLoading, setIsPreviewLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  // 코드 설명: [previewMessage, setPreviewMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  // 코드 설명: loadDashboard 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadDashboard() {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
    // 코드 설명: setSummaryState 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSummaryState({ status: "loading" }); setIncidentState({ status: "loading" }); setReportState({ status: "loading" }); setCctvState({ status: "loading" });
    // 코드 설명: [summaryResult, incidentResult, reportResult, cctvResult] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const [summaryResult, incidentResult, reportResult, cctvResult] = await Promise.allSettled([getDashboardSummary(), getIncidents(), getReports({ page: 1, size: 5 }), getCctvs()]);
    // 코드 설명: setSummaryState 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSummaryState(summaryResult.status === "fulfilled" ? { status: "success", data: summaryResult.value } : { status: "error", message: errorMessage(summaryResult.reason, "요약 API 응답을 확인해주세요.") });
    // 코드 설명: setIncidentState 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIncidentState(incidentResult.status === "fulfilled" ? { status: "success", data: incidentResult.value } : { status: "error", message: errorMessage(incidentResult.reason, "이벤트 API 응답을 확인해주세요.") });
    // 코드 설명: setReportState 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setReportState(reportResult.status === "fulfilled" ? { status: "success", data: reportResult.value.items } : { status: "error", message: errorMessage(reportResult.reason, "신고 API 응답을 확인해주세요.") });
    // 코드 설명: setCctvState 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setCctvState(cctvResult.status === "fulfilled" ? { status: "success", data: cctvResult.value } : { status: "error", message: errorMessage(cctvResult.reason, "CCTV API 응답을 확인해주세요.") });
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => { loadDashboard(); }, []);

  // 코드 설명: handleRealtimePreviewClick 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleRealtimePreviewClick() {
    // 코드 설명: setIsPreviewLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsPreviewLoading(true); setPreviewMessage(null);
    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try { const latestEvent = (await getRealtimeEventPreviews(5))[0]; if (!latestEvent) { setPreviewEvent(null); setIsPreviewOpen(false); setPreviewMessage("최근 이벤트가 없습니다."); return; } setPreviewEvent(latestEvent); setIsPreviewOpen(true); }
    catch { setPreviewEvent(null); setIsPreviewOpen(false); setPreviewMessage("실시간 이벤트를 불러오지 못했습니다."); }
    finally { setIsPreviewLoading(false); }
  }

  // 코드 설명: operationalCards 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const operationalCards = useMemo<StatCard[]>(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: incidentState.status !== "success" || reportState.status !== "success"
    if (incidentState.status !== "success" || reportState.status !== "success") return [];
    // 코드 설명: incidents 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const incidents = incidentState.data; const reports = reportState.data;
    // 코드 설명: analyzing 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const analyzing = reports.filter((report) => report.status === "ANALYZING" || getReportAnalysisStatus(report) === "ANALYZING").length;
    // 코드 설명: completed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const completed = reports.filter((report) => report.status === "CONVERTED_TO_INCIDENT" || getReportAnalysisStatus(report) === "COMPLETED").length;
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: [ { label: "전체 이벤트 수", value: String(incidents.length), helper: "API 응답…
    return [
      { label: "전체 이벤트 수", value: String(incidents.length), helper: "API 응답", tone: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
      { label: "미처리 이벤트 수", value: String(incidents.filter(isUnresolvedIncident).length), helper: "진행중", tone: "text-orange-600", bg: "bg-orange-50", icon: ShieldAlert },
      { label: "신고 접수 수", value: String(reports.length), helper: "조회 결과", tone: "text-sky-600", bg: "bg-sky-50", icon: FileText },
      { label: "분석/전환 완료", value: String(completed), helper: analyzing ? `${analyzing}건 분석중` : "완료", tone: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
    ];
  }, [incidentState, reportState]);

  // 코드 설명: summaryCards 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const summaryCards: StatCard[] = summaryState.status === "success" ? [
    ...(authUser?.role === "SUPER_ADMIN" ? [
      { label: "전체 사용자 수", value: String(summaryState.data.users.total), helper: "요약 API", tone: "text-sky-600", bg: "bg-sky-50", icon: Users },
      { label: "가입 승인 대기", value: String(summaryState.data.users.pending_signup), helper: "검토 필요", tone: "text-amber-600", bg: "bg-amber-50", icon: UserCheck },
    ] : []),
    { label: "미확인 알림", value: String(summaryState.data.notifications.unread_count), helper: "내 계정", tone: "text-red-600", bg: "bg-red-50", icon: Bell },
  ] : [];

  // 코드 설명: operationalState 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const operationalState: LoadState<unknown> =
    incidentState.status === "error" ? incidentState :
    reportState.status === "error" ? reportState :
    incidentState.status === "loading" || reportState.status === "loading" ? { status: "loading" } :
    { status: "success", data: null };

  // 코드 설명: incidents 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const incidents = incidentState.status === "success" ? incidentState.data : [];
  // 코드 설명: reports 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const reports = reportState.status === "success" ? reportState.data : [];
  // 코드 설명: cctvs 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const cctvs = cctvState.status === "success" ? cctvState.data : [];

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return <RequireAuth><AppLayout title="대시보드">
    <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-2xl font-black text-slate-950">통합 관제 대시보드</h2><p className="mt-2 text-sm font-medium text-slate-500">각 영역의 실제 API 상태를 독립적으로 표시합니다.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={handleRealtimePreviewClick} disabled={isPreviewLoading} className="inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50">{isPreviewLoading ? "불러오는 중" : "실시간 알림 미리보기"}</button><Link href="/incidents" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline">이벤트 관리</Link><Link href="/reports" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline">신고 관리</Link><button type="button" onClick={loadDashboard} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">새로고침</button></div></section>
    {previewMessage ? <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">{previewMessage}</div> : null}
    <div className="grid gap-4">
      <SectionState state={summaryState} loadingText="요약 정보를 불러오는 중입니다.">{summaryCards.length ? <StatGrid cards={summaryCards} /> : null}</SectionState>
      <SectionState state={operationalState} loadingText="이벤트와 신고 요약을 불러오는 중입니다.">{operationalCards.length ? <StatGrid cards={operationalCards} /> : null}</SectionState>
    </div>
    <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]"><DashboardPanel title="최근 이벤트 요약"><SectionState state={incidentState} loadingText="최근 이벤트를 불러오는 중입니다."><IncidentRows incidents={incidents.filter(isUnresolvedIncident).slice(0, 5)} /></SectionState></DashboardPanel><DashboardPanel title="CCTV 상태 요약"><SectionState state={cctvState} loadingText="CCTV 상태를 불러오는 중입니다."><CctvStatusGrid cctvs={cctvs} /></SectionState></DashboardPanel></section>
    <section className="mt-6 grid gap-5 xl:grid-cols-2"><DashboardPanel title="최근 신고 목록"><SectionState state={reportState} loadingText="최근 신고를 불러오는 중입니다."><ReportRows reports={reports.slice(0, 5)} /></SectionState></DashboardPanel><DashboardPanel title="처리 대기 이벤트"><SectionState state={incidentState} loadingText="처리 대기 이벤트를 불러오는 중입니다."><div className="rounded-lg border border-amber-100 bg-amber-50 p-5"><Clock3 className="h-6 w-6 text-amber-700" aria-hidden="true" /><strong className="mt-4 block text-3xl font-black text-amber-900">{incidents.filter((incident) => ["DETECTED", "REVIEWING", "ASSIGNED"].includes(incident.status)).length}</strong><p className="mt-1 text-sm font-semibold text-amber-700">확인 또는 조치가 필요한 이벤트</p></div></SectionState></DashboardPanel></section>
    <RealtimePreviewToast event={previewEvent} open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />
  </AppLayout></RequireAuth>;
}
