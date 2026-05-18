import { Bell, Bot, Cable, CheckCircle2, KeyRound, MonitorCheck, ServerCog, Settings } from "lucide-react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { mockSystemSettings } from "@/features/settings/mock";
import type { ServiceStatus, SettingsStatusItem } from "@/features/settings/types";

const statusTone: Record<ServiceStatus, "green" | "blue" | "amber" | "red" | "slate"> = {
  ONLINE: "green",
  READY: "blue",
  CONNECTED: "green",
  MOCK: "amber",
  LOCAL: "slate",
  DEGRADED: "amber",
  OFFLINE: "red",
};

function StatusRow({ item }: { item: SettingsStatusItem }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-950">{item.label}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{item.description}</p>
        </div>
        <Badge tone={statusTone[item.status]}>{item.status}</Badge>
      </div>
      {item.maskedValue ? (
        <p className="mt-3 rounded bg-white px-3 py-2 text-xs font-bold text-slate-500">
          {item.maskedValue}
        </p>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  const settings = mockSystemSettings;

  return (
    <RequireSuperAdmin title="시스템 설정">
      <AppLayout title="시스템 설정">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">시스템 설정</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              시스템 상태, 서버 연결 상태, 기본 설정을 read-only로 확인합니다.
            </p>
          </div>
          <Badge tone="blue">read-only mock</Badge>
        </section>

        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
          .env 값과 API Key는 화면에 직접 노출하지 않습니다. 민감 정보는 마스킹된 상태 정보만 표시합니다.
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-5">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <MonitorCheck className="h-5 w-5 text-teal-700" />
                <h3 className="text-base font-black text-slate-950">시스템 기본 정보</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400">서비스</p>
                  <p className="mt-2 font-black text-slate-950">{settings.systemInfo.serviceName}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400">Frontend</p>
                  <div className="mt-2">
                    <Badge tone={statusTone[settings.systemInfo.frontendStatus]}>{settings.systemInfo.frontendStatus}</Badge>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400">환경</p>
                  <p className="mt-2 font-black text-slate-950">{settings.systemInfo.environment}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400">빌드 모드</p>
                  <p className="mt-2 font-black text-slate-950">{settings.systemInfo.buildMode}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <ServerCog className="h-5 w-5 text-teal-700" />
                <h3 className="text-base font-black text-slate-950">API 연결 상태</h3>
              </div>
              <div className="grid gap-3">
                {settings.apiConnections.map((item) => (
                  <StatusRow key={`${item.id}-${item.status}`} item={item} />
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Cable className="h-5 w-5 text-teal-700" />
                <h3 className="text-base font-black text-slate-950">Socket.IO 연결 상태</h3>
              </div>
              <StatusRow item={settings.socketStatus} />
            </Card>
          </div>

          <div className="grid gap-5">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Bot className="h-5 w-5 text-teal-700" />
                <h3 className="text-base font-black text-slate-950">AI 서버 상태</h3>
              </div>
              <StatusRow item={settings.aiServerStatus} />
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-teal-700" />
                <h3 className="text-base font-black text-slate-950">LLM 설정 상태</h3>
              </div>
              <div className="grid gap-3">
                {settings.llmSettings.map((item) => (
                  <StatusRow key={`${item.id}-${item.status}`} item={item} />
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5 text-teal-700" />
                <h3 className="text-base font-black text-slate-950">알림 설정</h3>
              </div>
              <div className="grid gap-3">
                {settings.notificationSettings.map((item) => (
                  <div key={`${item.id}-${item.channel}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div>
                      <p className="font-black text-slate-950">{item.label}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{item.channel}</p>
                    </div>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${item.enabled ? "text-emerald-600" : "text-slate-300"}`} />
                      <Badge tone={item.enabled ? "green" : "slate"}>{item.enabled ? "ON" : "OFF"}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-500" />
                <p className="text-sm font-semibold leading-6 text-slate-500">
                  실제 설정 변경 기능은 추후 관리자 API 연결 후 활성화합니다.
                </p>
              </div>
            </Card>
          </div>
        </section>
      </AppLayout>
    </RequireSuperAdmin>
  );
}
