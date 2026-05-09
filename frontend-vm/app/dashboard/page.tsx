import { AlertTriangle, Clock3, ShieldAlert, ShieldCheck } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";

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

export default function DashboardPage() {
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
