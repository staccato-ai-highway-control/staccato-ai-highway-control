"use client";

import { Camera, FileVideo, RotateCcw } from "lucide-react";
import { useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { mockIncidents } from "@/features/incidents/mock";

const replayItems = mockIncidents.slice(0, 4).map((incident, index) => ({
  id: incident.id,
  title: incident.title,
  code: incident.code,
  cctvId: incident.cctvId,
  detectedAt: incident.detectedAt,
  snapshot: incident.snapshotUrl,
  replayUrl: "",
  duration: ["00:42", "01:18", "00:57", "02:04"][index] ?? "00:45",
}));

export default function ReplayPage() {
  const [selectedId, setSelectedId] = useState(replayItems[0]?.id ?? "");
  const selectedReplay = replayItems.find((item) => item.id === selectedId) ?? replayItems[0];

  return (
    <RequireAuth>
      <AppLayout title="리플레이">
        <section className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">이벤트 리플레이</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            이벤트별 Snapshot과 MP4 Replay Viewer를 확인합니다.
          </p>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950">{selectedReplay?.title}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">{selectedReplay?.code} · {selectedReplay?.cctvId}</p>
                </div>
                <Badge tone="blue">MP4</Badge>
              </div>
            </div>
            <div className="grid min-h-[420px] place-items-center bg-slate-950 p-5 text-white">
              {selectedReplay?.replayUrl ? (
                <video src={selectedReplay.replayUrl} controls className="max-h-[560px] w-full rounded-lg bg-black" />
              ) : (
                <div className="text-center">
                  <FileVideo className="mx-auto h-14 w-14 text-white/80" aria-hidden="true" />
                  <p className="mt-4 text-sm font-black">MP4 Replay Viewer</p>
                  <p className="mt-2 text-xs font-semibold text-white/60">Replay URL 연결 전에는 플레이어 영역만 표시합니다.</p>
                </div>
              )}
            </div>
          </Card>

          <aside className="grid content-start gap-5">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-slate-700" aria-hidden="true" />
                <h3 className="font-black text-slate-950">Snapshot</h3>
              </div>
              <div className="grid aspect-video place-items-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                {selectedReplay?.snapshot ? "Snapshot 이미지" : "Snapshot 대기"}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-slate-700" aria-hidden="true" />
                <h3 className="font-black text-slate-950">이벤트 목록</h3>
              </div>
              <div className="grid gap-2">
                {replayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`rounded-lg border p-3 text-left transition ${item.id === selectedReplay?.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    <b className="block text-sm">{item.code}</b>
                    <span className="mt-1 block text-xs font-semibold opacity-75">{item.detectedAt} · {item.duration}</span>
                  </button>
                ))}
              </div>
            </Card>
          </aside>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
