"use client";

import { Settings, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { CameraSlotSettingsModal } from "@/components/cctv/CameraSlotSettingsModal";
import { CctvCard } from "@/components/cctv/CctvCard";
import { CctvDetailModal } from "@/components/cctv/CctvDetailModal";
import { RoiSettingsModal } from "@/components/cctv/RoiSettingsModal";
import { getCameras, getCameraSlotConfig, getCctvSlots, saveCameraSlotConfig, type CameraSlotConfig } from "@/features/cctvs/api";
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
  const [cctvs, setCctvs] = useState<Cctv[]>([]);
  const [cameraSlotConfig, setCameraSlotConfig] = useState<CameraSlotConfig[]>(() => getCameraSlotConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraSettingsOpen, setIsCameraSettingsOpen] = useState(false);
  const [roiSlotNumber, setRoiSlotNumber] = useState<1 | 2 | null>(null);

  async function loadCctvData() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextSlots, nextCctvs] = await Promise.all([
        getCctvSlots().catch(() => getCameraSlotConfig()),
        getCameras().catch(() => []),
      ]);
      setCameraSlotConfig(nextSlots);
      setCctvs(nextCctvs);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "CCTV 정보를 불러오지 못했습니다.");
      setCameraSlotConfig(getCameraSlotConfig());
      setCctvs([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCctvData();
  }, []);

  const cctvById = useMemo(() => {
    const map = new Map<string, Cctv>();

    cctvs.forEach((cctv) => {
      const anyCctv = cctv as Cctv & Record<string, unknown>;
      const candidateKeys = [
        cctv.id,
        cctv.cctvCode,
        anyCctv.cctv_code,
        anyCctv.cameraId,
        anyCctv.camera_id,
      ]
        .filter(Boolean)
        .map(String);

      candidateKeys.forEach((key) => {
        map.set(key, cctv);
      });
    });

    return map;
  }, [cctvs]);

  const visibleCameraSlots = useMemo(() => {
    return cameraSlotConfig
      .map((slot) => ({ slot, cctv: slot.cctvId ? cctvById.get(slot.cctvId) : undefined }))
      .filter(({ cctv }) => !cctv || statusFilter === "ALL" || cctv.status === statusFilter);
  }, [cameraSlotConfig, cctvById, statusFilter]);

  const selectedCctvIndex = selectedCctv
    ? visibleCameraSlots.findIndex(({ cctv }) => cctv?.id === selectedCctv.id)
    : -1;

  const selectedCctvIncidents = selectedCctv
    ? manualIncidents.filter((incident) => incident.cctvId === selectedCctv.id)
    : [];

  function handleCreateManualIncident(payload: ManualIncidentPayload) {
    const incident = createManualIncident(payload, manualIncidents.length + 1);

    setManualIncidents((current) => [incident, ...current]);
    window.alert("시연용 이벤트가 생성되었습니다.");
  }

  async function handleSaveCameraSlotConfig(config: CameraSlotConfig[]) {
    setErrorMessage(null);

    try {
      const savedConfig = await saveCameraSlotConfig(config);
      setCameraSlotConfig(savedConfig);
      setIsCameraSettingsOpen(false);
      window.alert("관제 화면 카메라 순서 설정이 저장되었습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "카메라 슬롯 설정을 저장하지 못했습니다.");
    }
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

      {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}
      {isLoading ? <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">CCTV 슬롯 정보를 불러오는 중입니다.</div> : null}

      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {visibleCameraSlots.map(({ slot, cctv }, index) => (
          cctv ? (
            <CctvCard
              key={`${slot.slotNumber}-${cctv.id}`}
              cctv={cctv}
              index={index}
              slotNumber={slot.slotNumber}
              onSelect={setSelectedCctv}
              onConfigureRoi={setRoiSlotNumber}
            />
          ) : (
            <article key={`empty-${slot.slotNumber}`} className="grid min-h-[420px] content-between rounded-lg border-2 border-dashed border-slate-200 bg-white p-5 text-center shadow-sm">
              <div className="grid min-h-64 place-items-center rounded-lg bg-slate-100 text-slate-400">
                <div>
                  <strong className="block text-lg text-slate-600">{slot.slotNumber}번 슬롯</strong>
                  <p className="mt-2 text-sm font-semibold">카메라 미배정</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-500">설정에서 CCTV를 선택하면 이 슬롯에 영상이 표시됩니다.</p>
              </div>
            </article>
          )
        ))}
      </section>

      {visibleCameraSlots.length === 0 ? (
        <p className="mt-8 rounded-lg border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-500">
          선택한 상태에 맞는 CCTV 슬롯이 없습니다.
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
          cctvs={cctvs}
          config={cameraSlotConfig}
          onClose={() => setIsCameraSettingsOpen(false)}
          onSave={handleSaveCameraSlotConfig}
        />
      ) : null}

      {roiSlotNumber ? (
        <RoiSettingsModal
          initialSlotNumber={roiSlotNumber}
          slotConfig={cameraSlotConfig}
          cctvs={cctvs}
          onClose={() => setRoiSlotNumber(null)}
        />
      ) : null}
      </AppLayout>
    </RequireAuth>
  );
}
