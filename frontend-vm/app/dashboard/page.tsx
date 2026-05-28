"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Clock3, Cctv, FileText, ShieldAlert, UserCheck, Users } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorPage } from "@/components/common/ErrorPage";
import { Badge } from "@/components/common/Badge";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import type { AuthUser } from "@/features/auth/types";
import { getCctvs } from "@/features/cctvs/api";
import { getDashboardSummary, type DashboardSummary } from "@/features/dashboard/api";
import type { Cctv as CctvItem } from "@/features/cctvs/types";
import { getIncidents } from "@/features/incidents/api";
import { incidentTypeLabels, type Incident } from "@/features/incidents/types";
import { getReports } from "@/features/reports/api";
import type { Report } from "@/features/reports/types";
import { getStoredAuthUser } from "@/lib/authStorage";

type StatCard = {
  label: string;
  value: string;
  helper: string;
  tone: string;
  bg: string;
  icon: typeof AlertTriangle;
};

function isUnresolvedIncident(incident: Incident) {
  return !["RESOLVED", "CLOSED", "FALSE_POSITIVE"].includes(incident.status);
}

function getReportTitle(report: Report) {
  return report.title ?? report.subject ?? "제목 없음";
}

function getReportCode(report: Report) {
  return report.report_code ?? report.reportCode ?? `#${report.id}`;
}

function getReportLocation(report: Report) {
  return report.location ?? report.address ?? report.place_name ?? report.locationName ?? "-";
}

function getReportAnalysisStatus(report: Report) {
  return report.analysis_status ?? report.analysisStatus ?? "WAITING";
}

function StatGrid({ cards }: { cards: StatCard[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.tone}`} aria-hidden="true" />
              </span>
              <span className="text-xs font-medium text-slate-400">{card.helper}</span>
            </div>
            <strong className="mt-5 block text-3xl font-black text-slate-950">{card.value}</strong>
            <p className="mt-1 text-sm font-medium text-slate-500">{card.label}</p>
          </article>
        );
      })}
    </section>
  );
}

function IncidentRows({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return <p className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">표시할 이벤트가 없습니다.</p>;
  }

  return (
    <div className="grid gap-3">
      {incidents.map((incident) => (
        <Link key={incident.id} href={`/incidents/${incident.id}`} className="grid gap-3 rounded-lg border border-slate-100 p-4 text-slate-900 no-underline transition hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div className="min-w-0">
            <b className="block truncate text-sm text-slate-950">{incident.title}</b>
            <p className="mt-1 text-xs font-semibold text-slate-500">{incidentTypeLabels[incident.eventType]} · {incident.location}</p>
          </div>
          <RiskLevelBadge level={incident.riskLevel} />
          <IncidentStatusBadge status={incident.status} />
        </Link>
      ))}
    </div>
  );
}

function ReportRows({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return <p className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">표시할 신고가 없습니다.</p>;
  }

  return (
    <div className="grid gap-3">
      {reports.map((report) => (
        <Link key={report.id} href={`/reports/${report.id}`} className="rounded-lg border border-slate-100 p-4 text-slate-900 no-underline transition hover:bg-slate-50">
          <b className="block truncate text-sm text-slate-950">{getReportTitle(report)}</b>
          <p className="mt-1 text-xs font-semibold text-slate-500">{getReportCode(report)} · {report.status ?? "SUBMITTED"} · {getReportLocation(report)}</p>
        </Link>
      ))}
    </div>
  );
}

function CctvStatusGrid({ cctvs }: { cctvs: CctvItem[] }) {
  const statuses = ["ONLINE", "OFFLINE", "MAINTENANCE"] as const;

  return (
    <div className="grid grid-cols-3 gap-3">
      {statuses.map((status) => {
        const count = cctvs.filter((cctv) => cctv.status === status).length;
        const tone = status === "ONLINE" ? "green" : status === "OFFLINE" ? "red" : "amber";
        return (
          <div key={status} className="rounded-lg border border-slate-100 p-4 text-center">
            <Cctv className="mx-auto h-5 w-5 text-slate-500" aria-hidden="true" />
            <strong className="mt-3 block text-2xl font-black text-slate-950">{count}</strong>
            <p className="mt-1"><Badge tone={tone}>{status}</Badge></p>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [cctvs, setCctvs] = useState<CctvItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = getStoredAuthUser();
      setAuthUser(user);

      const [nextSummary, nextIncidents, nextReports, nextCctvs] = await Promise.all([
        getDashboardSummary().catch(() => null),
        getIncidents().catch(() => []),
        getReports({ page: 1, size: 5 }).then((result) => result.items).catch(() => []),
        getCctvs().catch(() => []),
      ]);

      setSummary(nextSummary);
      setIncidents(nextIncidents);
      setReports(nextReports);
      setCctvs(nextCctvs);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "대시보드 데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const cards = useMemo<StatCard[]>(() => {
    const unresolved = incidents.filter(isUnresolvedIncident);
    const analyzingReports = reports.filter((report) => report.status === "ANALYZING" || getReportAnalysisStatus(report) === "ANALYZING");
    const completedReports = reports.filter((report) => report.status === "CONVERTED_TO_INCIDENT" || getReportAnalysisStatus(report) === "COMPLETED");

    return [
      { label: "전체 이벤트 수", value: String(incidents.length), helper: "API 기준", tone: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
      { label: "미처리 이벤트 수", value: String(unresolved.length), helper: "진행중", tone: "text-orange-600", bg: "bg-orange-50", icon: ShieldAlert },
      { label: "신고 접수 수", value: String(reports.length), helper: "누적", tone: "text-sky-600", bg: "bg-sky-50", icon: FileText },
      { label: "분석/전환 완료", value: String(completedReports.length), helper: analyzingReports.length ? `${analyzingReports.length}건 분석중` : "완료", tone: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
    ];
  }, [incidents, reports]);

  const summaryCards: StatCard[] = [
    { label: "미확인 알림", value: String(summary?.notifications.unread_count ?? 0), helper: "내 계정", tone: "text-red-600", bg: "bg-red-50", icon: Bell },
  ];

  const adminCards = authUser?.role === "SUPER_ADMIN" ? [
    { label: "전체 사용자 수", value: summary?.users.total == null ? "-" : String(summary.users.total), helper: "요약 API", tone: "text-sky-600", bg: "bg-sky-50", icon: Users },
    { label: "가입 승인 대기", value: summary?.users.pending_signup == null ? "-" : String(summary.users.pending_signup), helper: "검토 필요", tone: "text-amber-600", bg: "bg-amber-50", icon: UserCheck },
  ] satisfies StatCard[] : [];

  return (
    <RequireAuth>
      <AppLayout title="대시보드">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">통합 관제 대시보드</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">이벤트, 신고, CCTV 상태를 실제 API 기준으로 확인합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/incidents" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50">이벤트 관리</Link>
            <Link href="/reports" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50">신고 관리</Link>
            <button type="button" onClick={loadDashboard} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">새로고침</button>
          </div>
        </section>

        {errorMessage && !isLoading ? (
          <ErrorPage
            statusCode={500}
            title="대시보드 데이터를 불러오지 못했습니다"
            description={errorMessage}
            actionLabel="다시 시도"
            actionHref={undefined}
            onAction={loadDashboard}
            secondaryActionLabel="알림으로 이동"
            secondaryActionHref="/notifications"
          />
        ) : null}
        {isLoading ? <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">대시보드 데이터를 불러오는 중입니다.</div> : null}

        {!errorMessage ? <StatGrid cards={adminCards.length ? [...adminCards, ...summaryCards, cards[0]].slice(0, 4) : [...summaryCards, ...cards.slice(0, 3)]} /> : null}

        {!errorMessage ? <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <DashboardPanel title="최근 이벤트 요약">
            <IncidentRows incidents={incidents.filter(isUnresolvedIncident).slice(0, 5)} />
          </DashboardPanel>
          <DashboardPanel title="CCTV 상태 요약">
            <CctvStatusGrid cctvs={cctvs} />
          </DashboardPanel>
        </section> : null}

        {!errorMessage ? <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <DashboardPanel title="최근 신고 목록">
            <ReportRows reports={reports.slice(0, 5)} />
          </DashboardPanel>
          <DashboardPanel title="처리 대기 이벤트">
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-5">
              <Clock3 className="h-6 w-6 text-amber-700" aria-hidden="true" />
              <strong className="mt-4 block text-3xl font-black text-amber-900">{incidents.filter((incident) => ["DETECTED", "REVIEWING", "ASSIGNED"].includes(incident.status)).length}</strong>
              <p className="mt-1 text-sm font-semibold text-amber-700">확인 또는 조치가 필요한 이벤트</p>
            </div>
          </DashboardPanel>
        </section> : null}
      </AppLayout>
    </RequireAuth>
  );
}
