"use client";

import { useState } from "react";
import {
  Activity,
  Cctv,
  Cpu,
  Database,
  FileUp,
  HardDrive,
  MemoryStick,
  Radio,
  Server,
} from "lucide-react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";

// ─── 환경 설정 탭 데이터 ──────────────────────────────────────────────────────

const environmentItems = [
  {
    title: "시스템 상태",
    description: "서비스 가용성과 배포 상태는 운영 서버 모니터링 및 배포 환경에서 확인합니다.",
    icon: Activity,
  },
  {
    title: "Flask API 서버",
    description: "API 주소, 실행 환경과 접근 정책은 서버 환경변수 및 배포 설정으로 관리합니다.",
    icon: Server,
  },
  {
    title: "AI VM",
    description: "AI 분석 서버 연결 정보와 실행 구성은 내부 인프라 설정에서 관리합니다.",
    icon: Cpu,
  },
  {
    title: "DB 연결",
    description: "데이터베이스 접속 정보와 자격 증명은 운영 서버의 보안 환경변수로 관리합니다.",
    icon: Database,
  },
  {
    title: "실시간 이벤트",
    description: "실시간 이벤트 연결 주소와 통신 정책은 서버 및 배포 환경에서 제어합니다.",
    icon: Radio,
  },
  {
    title: "CCTV 스트림",
    description: "스트림 원본 주소, 프록시와 접근 정책은 운영 인프라 설정을 따릅니다.",
    icon: Cctv,
  },
  {
    title: "파일 업로드 정책",
    description: "허용 형식, 용량 제한과 저장 경로는 백엔드 및 스토리지 정책으로 관리합니다.",
    icon: FileUp,
  },
];

// ─── 인프라 구성 탭 데이터 ────────────────────────────────────────────────────

const HOST_SPEC = {
  cpu: "Intel Core i7-6700 @ 3.40GHz · 4코어",
  memory: "15.88 GB",
  storage: "808 GB",
  hypervisor: "VMware ESXi 6.7.0 Update 2",
  note: "단일 물리 호스트에서 VMware ESXi를 통해 4개 VM을 분리 운영하는 MVP 구조",
};

interface VmSpec {
  name: string;
  role: string;
  cpu: string;
  memory: string;
  storage: string;
  gpu?: string;
}

const VM_SPECS: VmSpec[] = [
  {
    name: "FRONTEND-vm",
    role: "Next.js 관리자 UI",
    cpu: "2코어",
    memory: "3.04 GB",
    storage: "83 GB",
  },
  {
    name: "FLASK-vm",
    role: "API Gateway / 인증 / DB중계",
    cpu: "2코어",
    memory: "3.03 GB",
    storage: "83 GB",
  },
  {
    name: "AI-vm",
    role: "YOLO 차량 탐지",
    cpu: "2코어",
    memory: "3 GB",
    storage: "80 GB",
    gpu: "GTX 1060",
  },
  {
    name: "DB-vm",
    role: "MySQL 데이터 저장",
    cpu: "2코어",
    memory: "3.01 GB",
    storage: "53 GB",
  },
];

// ─── 인프라 구성 탭 컴포넌트 ─────────────────────────────────────────────────

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-bold text-slate-700">{value}</span>
    </div>
  );
}

function HostCard() {
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-white">
            <Server className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Physical Host</p>
            <h3 className="text-base font-black text-slate-950">호스트 물리 서버</h3>
          </div>
          <Badge tone="slate" className="ml-auto">ESXi 하이퍼바이저</Badge>
        </div>
      </div>
      <div className="px-6 pb-2">
        <div className="divide-y divide-slate-100">
          <SpecRow label="CPU" value={HOST_SPEC.cpu} />
          <SpecRow label="메모리" value={HOST_SPEC.memory} />
          <SpecRow label="스토리지" value={HOST_SPEC.storage} />
          <SpecRow label="하이퍼바이저" value={HOST_SPEC.hypervisor} />
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
        <p className="text-xs font-semibold text-slate-500">{HOST_SPEC.note}</p>
      </div>
    </Card>
  );
}

function VmCard({ vm }: { vm: VmSpec }) {
  const isAiVm = !!vm.gpu;

  return (
    <Card className="overflow-hidden">
      <div className={`border-b px-5 py-4 ${isAiVm ? "border-violet-100 bg-gradient-to-r from-violet-50 to-white" : "border-slate-100 bg-gradient-to-r from-slate-50 to-white"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white ${isAiVm ? "bg-violet-600" : "bg-sky-600"}`}>
              <Cpu className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">VM</p>
              <h4 className="text-sm font-black text-slate-950">{vm.name}</h4>
            </div>
          </div>
          {isAiVm && (
            <Badge tone="blue" className="shrink-0 bg-violet-50 text-violet-700 border-violet-200">
              GPU {vm.gpu}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">{vm.role}</p>
      </div>
      <div className="px-5 pb-1">
        <div className="divide-y divide-slate-100">
          <div className="flex items-center gap-3 py-2.5">
            <Cpu className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="text-xs font-bold text-slate-400">CPU</span>
            <span className="ml-auto text-sm font-bold text-slate-700">{vm.cpu}</span>
          </div>
          <div className="flex items-center gap-3 py-2.5">
            <MemoryStick className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="text-xs font-bold text-slate-400">메모리</span>
            <span className="ml-auto text-sm font-bold text-slate-700">{vm.memory}</span>
          </div>
          <div className="flex items-center gap-3 py-2.5">
            <HardDrive className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="text-xs font-bold text-slate-400">스토리지</span>
            <span className="ml-auto text-sm font-bold text-slate-700">{vm.storage}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfraTab() {
  return (
    <div>
      <HostCard />
      <div>
        <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">VM별 리소스</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {VM_SPECS.map((vm) => (
            <VmCard key={vm.name} vm={vm} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 탭 정의 ─────────────────────────────────────────────────────────────────

type TabId = "env" | "infra";

const TABS: { id: TabId; label: string }[] = [
  { id: "env", label: "환경 설정" },
  { id: "infra", label: "인프라 구성" },
];

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("env");

  return (
    <RequireSuperAdmin title="운영 환경 정보">
      <AppLayout title="운영 환경 정보">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Operation Environment</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">운영 환경 정보</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">시스템 연결 구성과 운영 정책의 관리 방식을 확인합니다.</p>
          </div>
          <Badge tone="blue">환경변수 기반 관리</Badge>
        </section>

        {/* 탭 네비게이션 */}
        <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 환경 설정 탭 */}
        {activeTab === "env" && (
          <>
            <Card className="mb-5 overflow-hidden">
              <div className="border-l-4 border-sky-500 bg-gradient-to-r from-sky-50 to-white px-6 py-5">
                <h3 className="text-base font-black text-slate-950">운영 설정 관리 안내</h3>
                <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
                  시스템 설정은 서버 환경변수 및 배포 설정으로 관리됩니다.<br />
                  현재 MVP에서는 관리자 화면에서 직접 수정하지 않고 운영 서버 설정을 통해 제어합니다.
                </p>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {environmentItems.map((item) => {
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

            <p className="mt-5 text-right text-xs font-semibold text-slate-400">향후 고도화: 설정 저장 API 연동 예정</p>
          </>
        )}

        {/* 인프라 구성 탭 */}
        {activeTab === "infra" && <InfraTab />}
      </AppLayout>
    </RequireSuperAdmin>
  );
}
