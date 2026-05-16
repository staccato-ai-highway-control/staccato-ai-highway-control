"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cctv,
  FileText,
  MapPin,
  Server,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import type { AuthUser } from "@/features/auth/types";
import { mockCctvs } from "@/features/cctvs/mock";
import { mockIncidents } from "@/features/incidents/mock";
import { incidentTypeLabels, type Incident } from "@/features/incidents/types";
import { mockReports } from "@/features/reports/mock";
import { getStoredAuthUser } from "@/lib/authStorage";

const stats = [
  { label: "오늘 발생 이상징후", value: "12", delta: "↑ 3 전일 대비", tone: "text-orange-600", icon: AlertTriangle, bg: "bg-orange-50" },
  { label: "미처리 사고", value: "4", delta: "↓ 1 전일 대비", tone: "text-red-600", icon: ShieldCheck, bg: "bg-red-50" },
  { label: "긴급 사고", value: "2", delta: "↑ 1 전일 대비", tone: "text-red-500", icon: ShieldAlert, bg: "bg-red-50" },
  { label: "평균 처리 시간", value: "8분 32초", delta: "↓ 45 초 단축", tone: "text-teal-600", icon: Clock3, bg: "bg-teal-50" },
];

const cctvs = [
  { id: "CCTV-01", location: "경부고속도로 수원IC", event: "탐지: tire (신뢰도 87%)", detected: true, border: "border-orange-500", bg: "from-emerald-950 via-slate-700 to-sky-200" },
  { id: "CCTV-02", location: "서해안고속도로 안산IC", event: "", detected: false, border: "border-slate-200", bg: "from-slate-800 via-slate-500 to-cyan-100" },
  { id: "CCTV-03", location: "영동고속도로 강릉IC", event: "", detected: false, border: "border-slate-200", bg: "from-emerald-950 via-teal-700 to-cyan-100" },
  { id: "CCTV-04", location: "중부고속도로 대전JC", event: "", detected: true, border: "border-orange-500", bg: "from-slate-900 via-slate-600 to-orange-100" },
];

const connectionStatus = [
  ["정상 연결", "156", "bg-emerald-50", "text-emerald-700", "border-emerald-100"],
  ["연결 끊김", "4", "bg-red-50", "text-red-700", "border-red-100"],
  ["점검중", "2", "bg-amber-50", "text-amber-700", "border-amber-100"],
];

const alerts = [
  ["확인중", "[낙하물] 경부고속도로 수원IC 인근 낙하물 탐지", "경부고속도로 수원IC 인근", "10:23:15", "border-orange-500", "bg-amber-50 text-amber-700"],
  ["출동요청", "[정지차량] 중부고속도로 대전JC 정지차량 감지", "중부고속도로 대전JC 인근", "10:20:30", "border-red-500", "bg-orange-50 text-orange-700"],
  ["발생", "[보행자진입] 서해안고속도로 평택JC 보행자 진입", "서해안고속도로 평택IC 인근", "10:18:45", "border-red-500", "bg-red-50 text-red-700"],
  ["확인중", "[역주행의심] 영동고속도로 강릉JC 역주행 의심", "영동고속도로 강릉JC 인근", "09:45:00", "border-orange-500", "bg-amber-50 text-amber-700"],
];

const incidentTypeDistribution = [
  ["낙하물", 28, "#f97316"],
  ["정지차량", 35, "#ef4444"],
  ["보행자진입", 8, "#dc2626"],
  ["역주행의심", 12, "#fbbf24"],
  ["사고의심", 17, "#94a3b8"],
];

const regionalCounts = [
  ["경기도", 42],
  ["강원도", 15],
  ["충청남도", 18],
  ["대전", 12],
  ["광주", 8],
  ["경상남도", 13],
];

function LegacyDashboardPage() {
  return (
    <RequireAuth>
      <AppLayout title="대시보드">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">대시보드</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              AI 기반 고속도로 돌발상황 실시간 현황
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
              시스템 정상
            </span>
            <span className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700">
              AI 서버 연결됨
            </span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article key={stat.label} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <span className={`grid h-10 w-10 place-items-center rounded-lg ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.tone}`} />
                  </span>
                  <span className={`text-xs font-medium ${stat.delta.startsWith("↓") ? "text-emerald-600" : "text-red-500"}`}>
                    {stat.delta}
                  </span>
                </div>
                <strong className="mt-5 block text-3xl font-black text-slate-950">{stat.value}</strong>
                <p className="mt-1 text-sm font-medium text-slate-500">{stat.label}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DashboardPanel
            title="실시간 CCTV 모니터링"
            className="min-h-[620px]"
            titleAction={
              <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                LIVE
              </span>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              {cctvs.map((cctv) => (
                <article key={cctv.id} className={`overflow-hidden rounded-lg border-2 ${cctv.border} bg-slate-950`}>
                  <div className={`relative h-64 bg-gradient-to-br ${cctv.bg}`}>
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(110deg,transparent_0_28%,rgba(15,23,42,0.5)_28%_34%,transparent_34%_45%,rgba(15,23,42,0.45)_45%_51%,transparent_51%_100%)]" />
                    <div className="absolute inset-x-12 bottom-0 h-2/3 bg-slate-800/40 [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)]" />
                    <div className="absolute left-3 top-3 flex gap-2">
                      <span className="rounded bg-red-600 px-2 py-1 text-xs font-black text-white">LIVE</span>
                      <span className="rounded bg-slate-700/90 px-2 py-1 text-xs font-black text-white">{cctv.id}</span>
                    </div>
                    <div className="absolute right-3 top-3 flex items-center gap-1">
                      <span className="text-xs text-white/70">⌁</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    </div>
                    {cctv.detected ? (
                      <span className="absolute left-3 top-11 rounded bg-orange-500 px-2 py-1 text-xs font-black text-white">
                        AI DETECTED
                      </span>
                    ) : null}
                    <div className="absolute bottom-3 left-3 text-white">
                      <b className="text-sm font-black drop-shadow">{cctv.location}</b>
                      {cctv.event ? <p className="mt-1 text-xs font-bold text-yellow-300">{cctv.event}</p> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </DashboardPanel>

          <div className="grid gap-5">
            <DashboardPanel title="CCTV 연결 상태" className="min-h-[230px]">
              <div className="grid grid-cols-3 gap-3">
                {connectionStatus.map(([label, value, bg, tone, border]) => (
                  <div key={label} className={`rounded-lg border ${border} ${bg} p-4 text-center`}>
                    <strong className={`block text-2xl font-black ${tone}`}>{value}</strong>
                    <span className={`mt-2 block text-xs font-bold ${tone}`}>{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>전체 CCTV</span>
                  <span>162대</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[96.3%] rounded-full bg-emerald-500" />
                </div>
                <p className="mt-2 text-right text-xs font-medium text-slate-400">가동률 96.3%</p>
              </div>
            </DashboardPanel>

            <DashboardPanel title="최근 이상징후 알림" className="min-h-[370px]" titleAction={<span className="text-xs font-medium text-slate-400">실시간</span>}>
              <div className="grid max-h-[295px] gap-4 overflow-y-auto pr-2">
                {alerts.map(([level, message, location, time, border, badge]) => (
                  <div key={message} className={`border-l-4 ${border} pl-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <b className="text-sm text-slate-950">{message}</b>
                        <p className="mt-1 text-xs font-medium text-slate-500">⊙ {location}  ◷ {time}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${badge}`}>{level}</span>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <DashboardPanel title="사고 유형별 분포" className="min-h-[320px]">
            <div className="flex h-full flex-col items-center justify-center gap-8">
              <div
                className="h-40 w-40 rounded-full"
                style={{
                  background: `conic-gradient(${incidentTypeDistribution
                    .map(([_, value, color], index) => {
                      const previous = incidentTypeDistribution
                        .slice(0, index)
                        .reduce((sum, item) => sum + Number(item[1]), 0);
                      return `${color} ${previous}% ${previous + Number(value)}%`;
                    })
                    .join(", ")})`,
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full">
                  <div className="h-20 w-20 rounded-full bg-white" />
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {incidentTypeDistribution.map(([label, value, color]) => (
                  <span key={label} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: String(color) }} />
                    {label} ({value})
                  </span>
                ))}
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel title="지역별 발생 건수" className="min-h-[320px]">
            <div className="grid h-full gap-4 py-2">
              {regionalCounts.map(([region, count]) => (
                <div key={region} className="grid grid-cols-[72px_1fr] items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">{region}</span>
                  <div className="h-5 rounded bg-slate-50">
                    <div
                      className="h-full rounded bg-teal-700"
                      style={{ width: `${(Number(count) / 60) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}

type StatCard = {
  label: string;
  value: string;
  helper: string;
  tone: string;
  bg: string;
  icon: typeof AlertTriangle;
};

const superAdminMock = {
  totalUsers: 23,
  pendingSignupRequests: 5,
  securityLogs: [
    ["관리자 로그인", "김관리", "2026-05-15 09:12"],
    ["권한 변경", "이순찰 -> 관제 관리자", "2026-05-15 08:44"],
    ["비밀번호 변경", "박출동", "2026-05-14 18:20"],
  ],
  signupRequests: [
    ["정현장", "출동 관리자", "요청"],
    ["오관제", "관제 관리자", "요청"],
    ["문조회", "일반 조회 계정", "검토중"],
  ],
};

const llmReportWaitingCount = 2;

function isUnresolvedIncident(incident: Incident) {
  return !["RESOLVED", "CLOSED", "FALSE_POSITIVE"].includes(incident.status);
}

function isProcessingIncident(incident: Incident) {
  return ["REVIEWING", "ASSIGNED"].includes(incident.status);
}

function isAssignedToUser(incident: Incident, user: AuthUser | null) {
  const assignee = incident.assignee?.trim();
  if (!assignee || assignee === "미배정") return false;

  const candidates = [user?.name, user?.login_id, user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim());

  return candidates.includes(assignee);
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

function ActionButtons({ actions }: { actions: Array<{ href: string; label: string }> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={`${action.href}-${action.label}`}
          href={action.href}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50"
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}

function IncidentRows({ incidents, hrefPrefix = "/incidents" }: { incidents: Incident[]; hrefPrefix?: string }) {
  if (incidents.length === 0) {
    return (
      <p className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
        표시할 사고가 없습니다.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {incidents.map((incident) => (
        <Link
          key={incident.id}
          href={`${hrefPrefix}/${incident.id}`}
          className="grid gap-3 rounded-lg border border-slate-100 p-4 text-slate-900 no-underline transition hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center"
        >
          <div className="min-w-0">
            <b className="block truncate text-sm text-slate-950">{incident.title}</b>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {incidentTypeLabels[incident.eventType]} · {incident.location}
            </p>
          </div>
          <RiskLevelBadge level={incident.riskLevel} />
          <IncidentStatusBadge status={incident.status} />
        </Link>
      ))}
    </div>
  );
}

function SuperAdminDashboard() {
  const unresolvedCount = mockIncidents.filter(isUnresolvedIncident).length;
  const cards: StatCard[] = [
    { label: "전체 사용자 수", value: String(superAdminMock.totalUsers), helper: "활성 계정", tone: "text-sky-600", bg: "bg-sky-50", icon: Users },
    { label: "가입 승인 대기 수", value: String(superAdminMock.pendingSignupRequests), helper: "검토 필요", tone: "text-amber-600", bg: "bg-amber-50", icon: UserCheck },
    { label: "전체 사고 수", value: String(mockIncidents.length), helper: "누적", tone: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
    { label: "미처리 사고 수", value: String(unresolvedCount), helper: "진행중", tone: "text-orange-600", bg: "bg-orange-50", icon: ShieldAlert },
  ];

  return (
    <>
      <DashboardHeader
        title="최고관리자 대시보드"
        description="사용자, 승인, 보안, 사고와 시스템 상태를 전체 관점에서 확인합니다."
        actions={[
          { href: "/admin/signup-requests", label: "가입 신청 관리" },
          { href: "/admin/users", label: "사용자 관리" },
          { href: "/admin/security-logs", label: "보안 로그 보기" },
          { href: "/settings", label: "시스템 설정" },
        ]}
      />
      <StatGrid cards={cards} />

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <DashboardPanel title="시스템 상태">
          <div className="grid gap-3 md:grid-cols-3">
            {["Flask API 정상", "DB 연결 정상", "AI 서버 연결"].map((item) => (
              <div key={item} className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <Server className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                <b className="mt-3 block text-sm text-emerald-800">{item}</b>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="최근 보안 로그">
          <div className="grid gap-3">
            {superAdminMock.securityLogs.map(([event, target, time]) => (
              <div key={`${event}-${time}`} className="rounded-lg border border-slate-100 p-3">
                <b className="text-sm text-slate-950">{event}</b>
                <p className="mt-1 text-xs font-semibold text-slate-500">{target} · {time}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <DashboardPanel title="최근 가입 신청 목록">
          <div className="grid gap-3">
            {superAdminMock.signupRequests.map(([name, role, status]) => (
              <div key={`${name}-${role}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div>
                  <b className="text-sm text-slate-950">{name}</b>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{role}</p>
                </div>
                <Badge tone="amber">{status}</Badge>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="최근 사고 요약">
          <IncidentRows incidents={mockIncidents.slice(0, 4)} />
        </DashboardPanel>
      </section>
    </>
  );
}

function ControlAdminDashboard() {
  const cards: StatCard[] = [
    { label: "신규 사고 수", value: String(mockIncidents.filter((incident) => incident.status === "DETECTED").length), helper: "탐지됨", tone: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
    { label: "처리 중 사고 수", value: String(mockIncidents.filter(isProcessingIncident).length), helper: "검토/배정", tone: "text-amber-600", bg: "bg-amber-50", icon: Clock3 },
    { label: "HIGH 위험도 사고 수", value: String(mockIncidents.filter((incident) => ["HIGH", "CRITICAL"].includes(incident.riskLevel)).length), helper: "고위험", tone: "text-orange-600", bg: "bg-orange-50", icon: ShieldAlert },
    { label: "AI 분석 완료 건", value: String(mockReports.filter((report) => report.analysisStatus === "COMPLETED").length), helper: "완료", tone: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
  ];

  return (
    <>
      <DashboardHeader
        title="관제관리자 대시보드"
        description="신규 사고, 신고 분석, CCTV 상태와 보고서 생성 흐름을 확인합니다."
        actions={[
          { href: "/incidents", label: "사고 확인" },
          { href: "/reports", label: "신고 관리" },
          { href: "/llm-reports", label: "LLM 보고서 생성" },
          { href: "/cctvs", label: "CCTV 관제 이동" },
        ]}
      />
      <StatGrid cards={cards} />

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <DashboardPanel title="최근 이상상황/신고 목록">
          <IncidentRows incidents={mockIncidents.filter(isUnresolvedIncident).slice(0, 4)} />
        </DashboardPanel>

        <DashboardPanel title="LLM 보고서 생성 대기">
          <div className="rounded-lg border border-sky-100 bg-sky-50 p-5">
            <FileText className="h-6 w-6 text-sky-700" aria-hidden="true" />
            <strong className="mt-4 block text-3xl font-black text-sky-900">{llmReportWaitingCount}</strong>
            <p className="mt-1 text-sm font-semibold text-sky-700">생성 대기 보고서</p>
          </div>
        </DashboardPanel>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <DashboardPanel title="최근 AI 분석 결과">
          <div className="grid gap-3">
            {mockReports.slice(0, 4).map((report) => (
              <div key={report.id} className="rounded-lg border border-slate-100 p-3">
                <b className="text-sm text-slate-950">{report.title}</b>
                <p className="mt-1 text-xs font-semibold text-slate-500">{report.analysisStatus} · {report.analysisSummary}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="CCTV 상태 요약">
          <div className="grid grid-cols-3 gap-3">
            {(["ONLINE", "OFFLINE", "MAINTENANCE"] as const).map((status) => {
              const count = mockCctvs.filter((cctv) => cctv.status === status).length;
              const tone = status === "ONLINE" ? "green" : status === "OFFLINE" ? "red" : "amber";

              return (
                <div key={status} className="rounded-lg border border-slate-100 p-4 text-center">
                  <Cctv className="mx-auto h-5 w-5 text-slate-500" aria-hidden="true" />
                  <strong className="mt-3 block text-2xl font-black text-slate-950">{count}</strong>
                  <p className="mt-1">
                    <Badge tone={tone}>{status}</Badge>
                  </p>
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      </section>
    </>
  );
}

function MaintainerDashboard({ user }: { user: AuthUser | null }) {
  const assignedIncidents = mockIncidents.filter((incident) => isAssignedToUser(incident, user));
  const waitingIncidents = assignedIncidents.filter((incident) => incident.status === "ASSIGNED");
  const processingIncidents = assignedIncidents.filter((incident) => incident.status === "REVIEWING");
  const completedIncidents = assignedIncidents.filter((incident) => ["RESOLVED", "CLOSED"].includes(incident.status));
  const cards: StatCard[] = [
    { label: "내 배정 사고 수", value: String(assignedIncidents.length), helper: "내 담당", tone: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle },
    { label: "출동 대기 수", value: String(waitingIncidents.length), helper: "배정됨", tone: "text-sky-600", bg: "bg-sky-50", icon: Clock3 },
    { label: "처리 중 사고 수", value: String(processingIncidents.length), helper: "현장 확인", tone: "text-orange-600", bg: "bg-orange-50", icon: ShieldCheck },
    { label: "처리 완료 수", value: String(completedIncidents.length), helper: "완료", tone: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
  ];

  return (
    <>
      <DashboardHeader
        title="출동관리자 대시보드"
        description="내게 배정된 사고와 출동 위치, 처리 상태를 확인합니다."
        actions={[
          { href: "/dispatch/map", label: "위치 확인" },
          { href: "/dispatch", label: "출동 관리" },
          { href: assignedIncidents[0] ? `/dispatch/incidents/${assignedIncidents[0].id}` : "/dispatch", label: "처리 상태 변경" },
          { href: assignedIncidents[0] ? `/dispatch/incidents/${assignedIncidents[0].id}` : "/dispatch", label: "사고 상세 보기" },
        ]}
      />
      <StatGrid cards={cards} />

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <DashboardPanel title="내 배정 사고 목록">
          <IncidentRows incidents={assignedIncidents} hrefPrefix="/dispatch/incidents" />
        </DashboardPanel>

        <DashboardPanel title="신규 배정 알림">
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-5">
            <AlertTriangle className="h-6 w-6 text-amber-700" aria-hidden="true" />
            <strong className="mt-4 block text-3xl font-black text-amber-900">{waitingIncidents.length}</strong>
            <p className="mt-1 text-sm font-semibold text-amber-700">확인 필요한 신규 배정</p>
          </div>
        </DashboardPanel>
      </section>

      <section className="mt-6">
        <DashboardPanel title="사고 위치 요약">
          {assignedIncidents.length === 0 ? (
            <p className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
              현재 사용자에게 배정된 사고 위치가 없습니다.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {assignedIncidents.map((incident) => (
                <div key={incident.id} className="rounded-lg border border-slate-100 p-4">
                  <MapPin className="h-5 w-5 text-amber-600" aria-hidden="true" />
                  <b className="mt-3 block text-sm text-slate-950">{incident.roadName}</b>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{incident.location}</p>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </section>
    </>
  );
}

function DashboardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: Array<{ href: string; label: string }>;
}) {
  return (
    <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>
      </div>
      <ActionButtons actions={actions} />
    </section>
  );
}

function DashboardAccessState({ isLoading, errorMessage }: { isLoading: boolean; errorMessage?: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-8 text-center">
      <h2 className="text-xl font-black text-slate-950">
        {isLoading ? "대시보드를 불러오는 중입니다." : "대시보드 접근 권한을 확인할 수 없습니다."}
      </h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        {errorMessage ?? "계정 상태가 승인 대기이거나 role 정보가 없습니다. 마이페이지에서 계정 상태를 확인해주세요."}
      </p>
      {!isLoading ? (
        <Link
          href="/mypage"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50"
        >
          마이페이지로 이동
        </Link>
      ) : null}
    </section>
  );
}

export default function DashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    try {
      setAuthUser(getStoredAuthUser());
    } catch {
      setErrorMessage("저장된 인증 정보를 읽지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const role = authUser?.role;
  const isActive = authUser?.account_status?.toUpperCase() === "ACTIVE";

  return (
    <RequireAuth>
      <AppLayout title="대시보드">
        {isLoading || errorMessage || !isActive || !role ? (
          <DashboardAccessState isLoading={isLoading} errorMessage={errorMessage} />
        ) : role === "SUPER_ADMIN" ? (
          <SuperAdminDashboard />
        ) : role === "CONTROL_ADMIN" ? (
          <ControlAdminDashboard />
        ) : role === "MAINTAINER" || role === "DISPATCH_ADMIN" ? (
          <MaintainerDashboard user={authUser} />
        ) : (
          <DashboardAccessState isLoading={false} />
        )}
      </AppLayout>
    </RequireAuth>
  );
}
