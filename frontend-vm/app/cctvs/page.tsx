"use client";

import { Settings, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { CameraSlotSettingsModal } from "@/components/cctv/CameraSlotSettingsModal";
import { CctvCard } from "@/components/cctv/CctvCard";
import { CctvDetailModal } from "@/components/cctv/CctvDetailModal";
import { RoiSettingsModal } from "@/components/cctv/RoiSettingsModal";
import { mockCctvs } from "@/features/cctvs/mock";
import { getCameraSlotConfig, saveCameraSlotConfig, type CameraSlotConfig } from "@/features/cctvs/api";
import type { Cctv } from "@/types/cctv";
import type { ManualIncident, ManualIncidentPayload } from "@/types/incident";

type StatusFilter = "ALL" | Cctv["status"];

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: "전체", value: "ALL" },
  { label: "정상", value: "ONLINE" },
  { label: "연결 끊김", value: "OFFLINE" },
  { label: "점검중", value: "MAINTENANCE" },
];

function formatNow() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function createManualIncident(
  payload: ManualIncidentPayload,
  sequence: number
): ManualIncident {
  // TODO: Replace this mock creator with POST /incidents or POST /reports when the Flask API contract is finalized.
  return {
    ...payload,
    id: `manual-incident-${sequence}`,
    incidentCode: `MAN-${String(sequence).padStart(4, "0")}`,
    createdAt: formatNow(),
  };
}

export default function CctvsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedCctv, setSelectedCctv] = useState<Cctv | null>(null);
  const [manualIncidents, setManualIncidents] = useState<ManualIncident[]>([]);
  const [cameraSlotConfig, setCameraSlotConfig] = useState<CameraSlotConfig[]>(() => getCameraSlotConfig());
  const [isCameraSettingsOpen, setIsCameraSettingsOpen] = useState(false);
  const [roiSlotNumber, setRoiSlotNumber] = useState<1 | 2 | null>(null);

  useEffect(() => {
    setCameraSlotConfig(getCameraSlotConfig());
  }, []);

  const cctvById = useMemo(() => new Map(mockCctvs.map((cctv) => [cctv.id, cctv])), []);

  const visibleCameraSlots = useMemo(() => {
    return cameraSlotConfig
      .map((slot) => ({ slot, cctv: cctvById.get(slot.cctvId) }))
      .filter((item): item is { slot: CameraSlotConfig; cctv: Cctv } => Boolean(item.cctv))
      .filter(({ cctv }) => statusFilter === "ALL" || cctv.status === statusFilter);
  }, [cameraSlotConfig, cctvById, statusFilter]);

  const selectedCctvIndex = selectedCctv
    ? visibleCameraSlots.findIndex(({ cctv }) => cctv.id === selectedCctv.id)
    : -1;

  const selectedCctvIncidents = selectedCctv
    ? manualIncidents.filter((incident) => incident.cctvId === selectedCctv.id)
    : [];

  function handleCreateManualIncident(payload: ManualIncidentPayload) {
    const incident = createManualIncident(payload, manualIncidents.length + 1);

    setManualIncidents((current) => [incident, ...current]);
    window.alert("시연용 이벤트가 생성되었습니다.");
  }

  function handleSaveCameraSlotConfig(config: CameraSlotConfig[]) {
    const savedConfig = saveCameraSlotConfig(config);
    setCameraSlotConfig(savedConfig);
    setIsCameraSettingsOpen(false);
    window.alert("관제 화면 카메라 순서 설정이 저장되었습니다.");
  }

  return (
    <RequireAuth>
      <AppLayout title="CCTV 관제">
      <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">CCTV 관제</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            고속도로 CCTV 실시간 모니터링 및 AI 탐지 현황
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCameraSettingsOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          카메라 설정
        </button>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 overflow-x-auto">
            <SlidersHorizontal className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`h-10 shrink-0 rounded-lg border px-4 text-sm font-black transition ${
                  statusFilter === filter.value
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {visibleCameraSlots.map(({ slot, cctv }, index) => (
          <CctvCard
            key={`${slot.slotNumber}-${cctv.id}`}
            cctv={cctv}
            index={index}
            slotNumber={slot.slotNumber}
            onSelect={setSelectedCctv}
            onConfigureRoi={setRoiSlotNumber}
          />
        ))}
      </section>

      {visibleCameraSlots.length === 0 ? (
        <p className="mt-8 rounded-lg border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-500">
          선택한 상태에 맞는 CCTV가 없습니다.
        </p>
      ) : null}

      {selectedCctv ? (
        <CctvDetailModal
          cctv={selectedCctv}
          cctvIndex={selectedCctvIndex >= 0 ? selectedCctvIndex : 0}
          incidents={selectedCctvIncidents}
          onClose={() => setSelectedCctv(null)}
          onCreateIncident={handleCreateManualIncident}
        />
      ) : null}

      {isCameraSettingsOpen ? (
        <CameraSlotSettingsModal
          cctvs={mockCctvs}
          config={cameraSlotConfig}
          onClose={() => setIsCameraSettingsOpen(false)}
          onSave={handleSaveCameraSlotConfig}
        />
      ) : null}

      {roiSlotNumber ? (
        <RoiSettingsModal
          initialSlotNumber={roiSlotNumber}
          slotConfig={cameraSlotConfig}
          cctvs={mockCctvs}
          onClose={() => setRoiSlotNumber(null)}
        />
      ) : null}
      </AppLayout>
    </RequireAuth>
  );
}
