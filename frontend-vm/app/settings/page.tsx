"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Cctv,
  Cpu,
  Database,
  FileUp,
  Globe,
  Key,
  Layers,
  Radio,
  Server,
  Shield,
  Target,
  Zap,
} from "lucide-react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { cn } from "@/lib/utils";

// ─── 탭 정의 ────────────────────────────────────────────────────────────────

type TabId = "overview" | "infra" | "api" | "security";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "시스템 개요" },
  { id: "infra", label: "인프라 구성" },
  { id: "api", label: "API 연동" },
  { id: "security", label: "보안 정책" },
];

// ─── 탭별 콘텐츠 컴포넌트 ────────────────────────────────────────────────────

function SystemOverviewTab() {
  const cards = [
    {
      icon: Target,
      title: "프로젝트 목적",
      description:
        "고속도로 정차 차량을 AI로 자동 탐지하여 2차 사고를 예방하고 신속한 관제 대응을 지원하는 통합 관제 시스템입니다.",
    },
    {
      icon: Layers,
      title: "운영 방식",
      description:
        "제한된 VMware 실습 환경에서 4개 VM 기반 MVP 운영 구조를 구축하였으며, 각 서버의 역할 경계를 명확히 분리하여 운영합니다.",
    },
    {
      icon: Server,
      title: "중심 서버",
      description:
        "Flask API 서버가 인증, 권한 검증, DB 저장, AI 요청 중계를 담당합니다. Frontend와 AI VM은 직접 통신하지 않습니다.",
    },
    {
      icon: Zap,
      title: "주요 기능",
      description:
        "CCTV 관제, 사고 신고 및 AI 영상 분석, 실시간 알림, 이벤트 리플레이, 게시판·자료실 운영을 지원합니다.",
    },
    {
      icon: Activity,
      title: "MVP 특징",
      description:
        "Frontend, Flask API, AI 분석, DB 저장 영역을 분리하여 역할 경계를 명확히 구현한 MVP 구조입니다.",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="border-l-4 border-sky-500 bg-gradient-to-r from-sky-50 to-white px-6 py-5">
          <h3 className="text-base font-black text-slate-950">제한 사양 기반 운영 인프라 구축</h3>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
            STACCATO는 AI 기반 고속도로 정차 차량 탐지 및 통합 관제 시스템입니다.
            <br />
            제한된 VMware 실습 환경에서 4개 VM 기반 MVP 운영 구조를 구축하였으며,
            <br />
            Frontend, Flask API, AI 분석, DB 저장 영역을 분리하여 역할 경계를 명확히 구현하였습니다.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{item.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function InfraTab() {
  const vms = [
    {
      icon: Globe,
      title: "Frontend VM",
      badge: "Next.js / React",
      badgeTone: "blue" as const,
      description: "관리자 및 사용자 UI를 제공합니다. 모든 API 요청은 Flask VM을 통해서만 처리합니다.",
      details: ["Next.js 기반 관리자 UI", "React 컴포넌트 구조", "Flask API 전용 호출"],
    },
    {
      icon: Server,
      title: "Flask VM",
      badge: "API Gateway",
      badgeTone: "sky" as const,
      description: "인증, 권한 검증, DB 저장, AI 요청 중계를 모두 담당하는 중심 서버입니다.",
      details: ["인증 및 권한 검증", "DB 저장 처리", "AI VM 요청 중계", "실시간 알림 (SocketIO)"],
    },
    {
      icon: Cpu,
      title: "AI VM",
      badge: "YOLO / OpenCV",
      badgeTone: "amber" as const,
      description: "YOLO 모델과 OpenCV를 활용하여 차량 탐지 및 정차 판단을 처리합니다.",
      details: ["차량 객체 탐지 (YOLO)", "정차 판단 로직 (OpenCV)", "분석 결과를 Flask에 반환"],
    },
    {
      icon: Database,
      title: "DB VM",
      badge: "MySQL",
      badgeTone: "green" as const,
      description: "운영 데이터를 MySQL로 저장합니다. Flask 서버만 직접 접근합니다.",
      details: ["사용자/권한 정보 저장", "사고·신고 데이터 저장", "게시판·자료실 데이터 저장"],
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {vms.map((vm) => {
          const Icon = vm.icon;
          return (
            <Card key={vm.title} className="p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-slate-950">{vm.title}</h3>
                    <Badge tone={vm.badgeTone}>{vm.badge}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{vm.description}</p>
                  <ul className="mt-3 flex flex-col gap-1">
                    {vm.details.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-base font-black text-slate-950">VM 구성도</h3>
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-slate-50 px-6 py-6">
          {[
            { label: "사용자 브라우저", color: "bg-slate-200 text-slate-700" },
            null,
            { label: "Frontend VM", color: "bg-sky-100 text-sky-800" },
            null,
            { label: "Flask VM", color: "bg-sky-500 text-white" },
            null,
            { label: "AI VM", color: "bg-amber-100 text-amber-800" },
          ].map((item, i) => {
            if (item === null) {
              return (
                <ArrowRight key={i} className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              );
            }
            return (
              <span
                key={i}
                className={cn("rounded-lg px-3 py-2 text-xs font-black", item.color)}
              >
                {item.label}
              </span>
            );
          })}
        </div>
        <div className="mt-2 flex justify-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="h-3 w-3 rounded-sm bg-sky-500" />
            Flask VM은 AI VM과 DB VM 양쪽에 연결됩니다.
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-slate-50 px-6 py-3">
          <span className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-black text-white">Flask VM</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="rounded-lg bg-green-100 px-3 py-2 text-xs font-black text-green-800">DB VM</span>
        </div>
      </Card>
    </div>
  );
}

function ApiTab() {
  const flows = [
    {
      step: "01",
      title: "로그인 / 회원가입",
      icon: Key,
      path: ["Frontend", "Flask", "DB"],
      description: "사용자 인증 정보는 Flask를 통해 DB에 저장·조회됩니다.",
    },
    {
      step: "02",
      title: "사고 / CCTV 조회",
      icon: Cctv,
      path: ["Frontend", "Flask", "DB"],
      description: "이벤트 및 CCTV 데이터를 Flask API를 통해 DB에서 조회합니다.",
    },
    {
      step: "03",
      title: "영상 분석 요청",
      icon: Cpu,
      path: ["Frontend", "Flask", "AI VM", "Flask", "DB"],
      description: "신고 영상 분석은 Flask → AI VM → Flask 경로로 처리 후 결과를 DB에 저장합니다.",
    },
    {
      step: "04",
      title: "실시간 알림",
      icon: Radio,
      path: ["Flask", "Frontend"],
      description: "SocketIO를 통해 Flask에서 Frontend로 실시간 이벤트 알림을 전송합니다.",
    },
    {
      step: "05",
      title: "게시판",
      icon: Activity,
      path: ["Frontend", "Flask", "DB"],
      description: "게시판 및 자료실 데이터는 Flask API를 통해 DB에서 CRUD 처리됩니다.",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="border-l-4 border-sky-500 bg-gradient-to-r from-sky-50 to-white px-6 py-5">
          <h3 className="text-base font-black text-slate-950">API 연동 원칙</h3>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
            Frontend는 Flask API만 호출합니다. Flask가 인증·권한 검증 후 DB 또는 AI 서버와 통신하며,
            <br />
            Frontend에서 AI VM이나 DB에 직접 접근하는 경로는 존재하지 않습니다.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {flows.map((flow) => {
          const Icon = flow.icon;
          return (
            <Card key={flow.step} className="p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-sky-600">{flow.step}</span>
                    <h3 className="text-base font-black text-slate-950">{flow.title}</h3>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {flow.path.map((node, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          {node}
                        </span>
                        {i < flow.path.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{flow.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SecurityTab() {
  const policies = [
    {
      icon: Database,
      title: "DB 직접 접근 제한",
      tone: "red" as const,
      label: "Flask 전용",
      description:
        "DB에 직접 접근하는 서버는 Flask VM 하나뿐입니다. Frontend와 AI VM은 DB에 직접 연결할 수 없습니다.",
    },
    {
      icon: Globe,
      title: "Frontend 직접 호출 차단",
      tone: "red" as const,
      label: "접근 불가",
      description:
        "Frontend는 AI 서버 및 DB 서버를 직접 호출하지 않습니다. 모든 요청은 Flask API를 경유합니다.",
    },
    {
      icon: Cpu,
      title: "AI 서버 DB 접근 차단",
      tone: "amber" as const,
      label: "결과만 반환",
      description:
        "AI VM은 DB에 직접 접근하지 않습니다. 분석 결과만 Flask에 반환하며, DB 저장은 Flask가 처리합니다.",
    },
    {
      icon: Shield,
      title: "인증 및 권한 검증",
      tone: "blue" as const,
      label: "Flask 처리",
      description:
        "인증과 권한 검증은 Flask 서버에서 처리합니다. 모든 API 요청은 Flask를 통해 인증 상태를 확인합니다.",
    },
    {
      icon: FileUp,
      title: "파일 저장 정책",
      tone: "green" as const,
      label: "분리 저장",
      description:
        "파일 원본은 서버 저장소에 저장하고, DB에는 파일 경로와 메타데이터만 저장합니다. 파일 직접 노출을 최소화합니다.",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="border-l-4 border-sky-500 bg-gradient-to-r from-sky-50 to-white px-6 py-5">
          <h3 className="text-base font-black text-slate-950">보안 정책 원칙</h3>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
            각 VM은 필요한 통신 경로만 허용하며, 직접 접근을 최소화하는 원칙으로 설계되었습니다.
            <br />
            Flask가 유일한 데이터 게이트웨이로 인증, 권한, 저장을 일원화합니다.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {policies.map((policy) => {
          const Icon = policy.icon;
          return (
            <Card key={policy.title} className="p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-slate-950">{policy.title}</h3>
                    <Badge tone={policy.tone}>{policy.label}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{policy.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

function SettingsContent() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <AppLayout title="운영 환경 정보">
      {/* 헤더 */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Operation Environment</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">운영 환경 정보</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            STACCATO 시스템의 인프라 구성, API 연동 구조, 보안 정책을 확인합니다.
          </p>
        </div>
        <Badge tone="blue">4개 VM 기반 MVP</Badge>
      </section>

      {/* 탭 네비게이션 */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200/90 bg-slate-100/60 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "min-w-max flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors",
              activeTab === tab.id
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "overview" && <SystemOverviewTab />}
      {activeTab === "infra" && <InfraTab />}
      {activeTab === "api" && <ApiTab />}
      {activeTab === "security" && <SecurityTab />}
    </AppLayout>
  );
}

export default function SettingsPage() {
  return (
    <RequireSuperAdmin title="운영 환경 정보">
      <SettingsContent />
    </RequireSuperAdmin>
  );
}
