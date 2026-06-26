"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Clock3, Cctv, FileText, ShieldAlert, UserCheck, Users } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { RealtimePreviewToast } from "@/components/notifications/RealtimePreviewToast";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import type { AuthUser } from "@/features/auth/types";
import { getCctvs } from "@/features/cctvs/api";
import type { Cctv as CctvItem } from "@/features/cctvs/types";
import { getDashboardSummary, type DashboardSummary } from "@/features/dashboard/api";
import { getIncidents } from "@/features/incidents/api";
import { incidentTypeLabels, type Incident } from "@/features/incidents/types";
import { getReports } from "@/features/reports/api";
import type { Report } from "@/features/reports/types";
import { getRealtimeEventPreviews } from "@/features/realtime/api";
import type { RealtimeEventPreview } from "@/features/realtime/types";
import { getStoredAuthUser } from "@/lib/authStorage";

type LoadState<T> = { status: "loading" } | { status: "success"; data: T } | { status: "error"; message: string };
type StatCard = { label: string; value: string; helper: string; tone: string; bg: string; icon: typeof AlertTriangle };

function errorMessage(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback; }
function isUnresolvedIncident(incident: Incident) { return !["RESOLVED", "CLOSED", "FALSE_POSITIVE"].includes(incident.status); }
function getReportTitle(report: Report) { return report.title ?? report.subject ?? "제목 없음"; }
function getReportCode(report: Report) { return report.report_code ?? report.reportCode ?? `#${report.id}`; }
function getReportLocation(report: Report) { return report.location ?? report.address ?? report.place_name ?? report.locationName ?? "-"; }
function getReportAnalysisStatus(report: Report) { return report.analysis_status ?? report.analysisStatus ?? "WAITING"; }

function SectionState({ state, loadingText, children }: { state: LoadState<unknown>; loadingText: string; children: React.ReactNode }) {
  if (state.status === "loading") return <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">{loadingText}</p>;
  if (state.status === "error") return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700"><b className="block">데이터를 불러오지 못했습니다.</b><span className="mt-1 block">{state.message}</span></div>;
  return <>{children}</>;
}

function StatGrid({ cards }: { cards: StatCard[] }) {
  return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map((card) => { const Icon = card.icon; return <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-lg ${card.bg}`}><Icon className={`h-5 w-5 ${card.tone}`} aria-hidden="true" /></span><span className="text-xs font-medium text-slate-400">{card.helper}</span></div><strong className="mt-5 block text-3xl font-black text-slate-950">{card.value}</strong><p className="mt-1 text-sm font-medium text-slate-500">{card.label}</p></article>; })}</section>;
}

function IncidentRows({ incidents }: { incidents: Incident[] }) {
  if (!incidents.length) return <p className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">최근 이벤트가 없습니다.</p>;
  return <div className="grid gap-3">{incidents.map((incident) => <Link key={incident.id} href={`/incidents/${incident.id}`} className="grid gap-3 rounded-lg border border-slate-100 p-4 text-slate-900 no-underline transition hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center"><div className="min-w-0"><b className="block truncate text-sm text-slate-950">{incident.title}</b><p className="mt-1 text-xs font-semibold text-slate-500">{incidentTypeLabels[incident.eventType]} · {incident.location}</p></div><RiskLevelBadge level={incident.riskLevel} /><IncidentStatusBadge status={incident.status} /></Link>)}</div>;
}

function ReportRows({ reports }: { reports: Report[] }) {
  if (!reports.length) return <p className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">최근 신고가 없습니다.</p>;
  return <div className="grid gap-3">{reports.map((report) => <Link key={report.id} href={`/reports/${report.id}`} className="rounded-lg border border-slate-100 p-4 text-slate-900 no-underline transition hover:bg-slate-50"><b className="block truncate text-sm text-slate-950">{getReportTitle(report)}</b><p className="mt-1 text-xs font-semibold text-slate-500">{getReportCode(report)} · {report.status ?? "SUBMITTED"} · {getReportLocation(report)}</p></Link>)}</div>;
}

function CctvStatusGrid({ cctvs }: { cctvs: CctvItem[] }) {
  if (!cctvs.length) return <p className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">등록된 CCTV가 없습니다.</p>;
  return <div className="grid grid-cols-3 gap-3">{(["ONLINE", "OFFLINE", "MAINTENANCE"] as const).map((status) => { const count = cctvs.filter((cctv) => cctv.status === status).length; return <div key={status} className="rounded-lg border border-slate-100 p-4 text-center"><Cctv className="mx-auto h-5 w-5 text-slate-500" aria-hidden="true" /><strong className="mt-3 block text-2xl font-black text-slate-950">{count}</strong><p className="mt-1"><Badge tone={status === "ONLINE" ? "green" : status === "OFFLINE" ? "red" : "amber"}>{status}</Badge></p></div>; })}</div>;
}

export default function DashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [summaryState, setSummaryState] = useState<LoadState<DashboardSummary>>({ status: "loading" });
  const [incidentState, setIncidentState] = useState<LoadState<Incident[]>>({ status: "loading" });
  const [reportState, setReportState] = useState<LoadState<Report[]>>({ status: "loading" });
  const [cctvState, setCctvState] = useState<LoadState<CctvItem[]>>({ status: "loading" });
  const [previewEvent, setPreviewEvent] = useState<RealtimeEventPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  async function loadDashboard() {
    setAuthUser(getStoredAuthUser());
    setSummaryState({ status: "loading" }); setIncidentState({ status: "loading" }); setReportState({ status: "loading" }); setCctvState({ status: "loading" });
    const [summaryResult, incidentResult, reportResult, cctvResult] = await Promise.allSettled([getDashboardSummary(), getIncidents(), getReports({ page: 1, size: 5 }), getCctvs()]);
    setSummaryState(summaryResult.status === "fulfilled" ? { status: "success", data: summaryResult.value } : { status: "error", message: errorMessage(summaryResult.reason, "요약 API 응답을 확인해주세요.") });
    setIncidentState(incidentResult.status === "fulfilled" ? { status: "success", data: incidentResult.value } : { status: "error", message: errorMessage(incidentResult.reason, "이벤트 API 응답을 확인해주세요.") });
    setReportState(reportResult.status === "fulfilled" ? { status: "success", data: reportResult.value.items } : { status: "error", message: errorMessage(reportResult.reason, "신고 API 응답을 확인해주세요.") });
    setCctvState(cctvResult.status === "fulfilled" ? { status: "success", data: cctvResult.value } : { status: "error", message: errorMessage(cctvResult.reason, "CCTV API 응답을 확인해주세요.") });
  }

  useEffect(() => { loadDashboard(); }, []);

  async function handleRealtimePreviewClick() {
    setIsPreviewLoading(true); setPreviewMessage(null);
    try { const latestEvent = (await getRealtimeEventPreviews(5))[0]; if (!latestEvent) { setPreviewEvent(null); setIsPreviewOpen(false); setPreviewMessage("최근 이벤트가 없습니다."); return; } setPreviewEvent(latestEvent); setIsPreviewOpen(true); }
    catch { setPreviewEvent(null); setIsPreviewOpen(false); setPreviewMessage("실시간 이벤트를 불러오지 못했습니다."); }
    finally { setIsPreviewLoading(false); }
  }

  const operationalCards = useMemo<StatCard[]>(() => {
    if (incidentState.status !== "success" || reportState.status !== "success") return [];
    const incidents = incidentState.data; const reports = reportState.data;
    const analyzing = reports.filter((report) => report.status === "ANALYZING" || getReportAnalysisStatus(report) === "ANALYZING").length;
    const completed = reports.filter((report) => report.status === "CONVERTED_TO_INCIDENT" || getReportAnalysisStatus(report) === "COMPLETED").length;
    return [
      { label: "전체 이벤트 수", value: String(incidents.length), helper: "API 응답", tone: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
      { label: "미처리 이벤트 수", value: String(incidents.filter(isUnresolvedIncident).length), helper: "진행중", tone: "text-orange-600", bg: "bg-orange-50", icon: ShieldAlert },
      { label: "신고 접수 수", value: String(reports.length), helper: "조회 결과", tone: "text-sky-600", bg: "bg-sky-50", icon: FileText },
      { label: "분석/전환 완료", value: String(completed), helper: analyzing ? `${analyzing}건 분석중` : "완료", tone: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
    ];
  }, [incidentState, reportState]);

  const summaryCards: StatCard[] = summaryState.status === "success" ? [
    ...(authUser?.role === "SUPER_ADMIN" ? [
      { label: "전체 사용자 수", value: String(summaryState.data.users.total), helper: "요약 API", tone: "text-sky-600", bg: "bg-sky-50", icon: Users },
      { label: "가입 승인 대기", value: String(summaryState.data.users.pending_signup), helper: "검토 필요", tone: "text-amber-600", bg: "bg-amber-50", icon: UserCheck },
    ] : []),
    { label: "미확인 알림", value: String(summaryState.data.notifications.unread_count), helper: "내 계정", tone: "text-red-600", bg: "bg-red-50", icon: Bell },
  ] : [];

  const operationalState: LoadState<unknown> =
    incidentState.status === "error" ? incidentState :
    reportState.status === "error" ? reportState :
    incidentState.status === "loading" || reportState.status === "loading" ? { status: "loading" } :
    { status: "success", data: null };

  const incidents = incidentState.status === "success" ? incidentState.data : [];
  const reports = reportState.status === "success" ? reportState.data : [];
  const cctvs = cctvState.status === "success" ? cctvState.data : [];

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
