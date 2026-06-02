"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { BboxDetectionOverlay } from "@/components/cctv/BboxDetectionOverlay";
import { CctvFrame, statusLabels } from "@/components/cctv/CctvCard";
import { CctvDetailModal } from "@/components/cctv/CctvDetailModal";
import { RoiSettingsModal } from "@/components/cctv/RoiSettingsModal";
import { getCameras, type CameraSlotConfig } from "@/features/cctvs/api";
import type { Cctv } from "@/types/cctv";
import type { ManualIncident, ManualIncidentPayload } from "@/types/incident";

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
  return {
    ...payload,
    id: `manual-incident-${sequence}`,
    incidentCode: `MAN-${String(sequence).padStart(4, "0")}`,
    createdAt: formatNow(),
  };
}

function getCameraLabel(cctv: Cctv, index: number) {
  const raw = cctv as Cctv & Record<string, unknown>;
  const primary =
    cctv.name ||
    String(raw.location_name ?? "") ||
    cctv.locationName ||
    String(raw.road_name ?? "") ||
    cctv.roadName ||
    cctv.id;
  const roadName = cctv.roadName && cctv.roadName !== "-" ? cctv.roadName : String(raw.road_name ?? "");
  const direction = cctv.direction && cctv.direction !== "-" ? cctv.direction : "";
  const detail = [roadName, direction].filter(Boolean).join(" ");
  const label = detail && !String(primary).includes(detail) ? `${primary} - ${detail}` : primary;

  return `카메라 ${index + 1} - ${label}`;
}

function getStatusBadgeClass(status: Cctv["status"]) {
  if (status === "OFFLINE") return "border-red-300 text-red-600";
  if (status === "MAINTENANCE") return "border-yellow-300 text-yellow-600";
  return "border-emerald-300 text-emerald-600";
}

function createSingleSlotConfig(cctv: Cctv | null): CameraSlotConfig[] {
  if (!cctv) return [];

  return [
    {
      slotNumber: 1,
      cctvId: cctv.id,
      cctvName: cctv.cctvCode || cctv.name || cctv.id,
      streamUrl: cctv.streamUrl,
    },
  ];
}

export default function CctvsPage() {
  const [selectedCctvId, setSelectedCctvId] = useState<string>("");
  const [selectedDetailCctv, setSelectedDetailCctv] = useState<Cctv | null>(null);
  const [manualIncidents, setManualIncidents] = useState<ManualIncident[]>([]);
  const [cctvs, setCctvs] = useState<Cctv[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRoiSettingsOpen, setIsRoiSettingsOpen] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);

  async function loadCctvData() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextCctvs = await getCameras({ limit: 60 });
      setCctvs(nextCctvs);
      setSelectedCctvId((currentId) => {
        if (nextCctvs.length === 0) return "";
        return nextCctvs.some((cctv) => cctv.id === currentId) ? currentId : nextCctvs[0].id;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "CCTV 정보를 불러오지 못했습니다.");
      setCctvs([]);
      setSelectedCctvId("");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCctvData();
  }, []);

  const selectedCctv = useMemo(() => {
    return cctvs.find((cctv) => cctv.id === selectedCctvId) ?? cctvs[0] ?? null;
  }, [cctvs, selectedCctvId]);

  const selectedCctvIndex = selectedCctv ? cctvs.findIndex((cctv) => cctv.id === selectedCctv.id) : -1;
  const selectedCctvIncidents = selectedCctv
    ? manualIncidents.filter((incident) => incident.cctvId === selectedCctv.id)
    : [];
  const roiSlotConfig = useMemo(() => createSingleSlotConfig(selectedCctv), [selectedCctv]);
  const isMainStreamVisible = Boolean(selectedCctv && !isRoiSettingsOpen);

  useEffect(() => {
    setIsStreamReady(false);
  }, [selectedCctv?.streamUrl, isMainStreamVisible]);

  function handleCreateManualIncident(payload: ManualIncidentPayload) {
    const incident = createManualIncident(payload, manualIncidents.length + 1);

    setManualIncidents((current) => [incident, ...current]);
    window.alert("시연용 이벤트가 생성되었습니다.");
  }

  return (
    <RequireAuth>
      <AppLayout title="CCTV 관제">
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">CCTV 관제</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              카메라를 선택하면 선택한 CCTV 1개만 실시간 송출합니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="cctv-camera-select">카메라 선택</label>
            <select
              id="cctv-camera-select"
              value={selectedCctv?.id ?? ""}
              onChange={(event) => setSelectedCctvId(event.target.value)}
              disabled={isLoading || cctvs.length === 0}
              className="h-11 min-w-72 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {cctvs.length === 0 ? <option value="">카메라 없음</option> : null}
              {cctvs.map((cctv, index) => (
                <option key={cctv.id} value={cctv.id}>
                  {getCameraLabel(cctv, index)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadCctvData}
              disabled={isLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              새로고침
            </button>
          </div>
        </section>

        {errorMessage ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}
        {isLoading ? (
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
            CCTV 정보를 불러오는 중입니다.
          </div>
        ) : null}

        {!isLoading && cctvs.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-500">
            사용 가능한 CCTV가 없습니다.
          </p>
        ) : null}

        {selectedCctv ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-1 text-xs font-black text-white">
                      {selectedCctv.cctvCode}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${getStatusBadgeClass(selectedCctv.status)}`}>
                      {statusLabels[selectedCctv.status]}
                    </span>
                  </div>
                  <h3 className="truncate text-xl font-black text-slate-950">
                    {selectedCctv.roadName} {selectedCctv.locationName}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {selectedCctv.name} · {selectedCctv.direction} · 마지막 업데이트: {selectedCctv.lastUpdatedAt}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailCctv(selectedCctv)}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    상세 보기
                  </button>
                  {selectedCctv.imageUrl ? (
                    <a
                      href={selectedCctv.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      스냅샷 보기
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsRoiSettingsOpen(true)}
                    className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    ROI 설정
                  </button>
                </div>
              </div>
              <CctvFrame
                cctv={selectedCctv}
                index={selectedCctvIndex >= 0 ? selectedCctvIndex : 0}
                large
                showStream={isMainStreamVisible}
                onStreamError={() => setIsStreamReady(false)}
                onStreamLoad={() => setIsStreamReady(true)}
              >
                <BboxDetectionOverlay cctv={selectedCctv} enabled={isMainStreamVisible && isStreamReady} />
              </CctvFrame>
            </section>

            <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-black text-slate-950">CCTV metadata 목록</h3>
                <span className="text-xs font-bold text-slate-400">{cctvs.length}개</span>
              </div>
              <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">
                {cctvs.map((cctv, index) => {
                  const isSelected = cctv.id === selectedCctv.id;

                  return (
                    <button
                      key={cctv.id}
                      type="button"
                      onClick={() => setSelectedCctvId(cctv.id)}
                      className={`rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? "border-teal-500 bg-teal-50 text-teal-950"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <b className="block truncate text-sm">{getCameraLabel(cctv, index)}</b>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                        {cctv.cctvCode} · {statusLabels[cctv.status]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        ) : null}

        {selectedDetailCctv ? (
          <CctvDetailModal
            cctv={selectedDetailCctv}
            cctvIndex={selectedCctvIndex >= 0 ? selectedCctvIndex : 0}
            incidents={selectedCctvIncidents}
            onClose={() => setSelectedDetailCctv(null)}
            onCreateIncident={handleCreateManualIncident}
          />
        ) : null}

        {isRoiSettingsOpen && selectedCctv ? (
          <RoiSettingsModal
            initialSlotNumber={1}
            slotConfig={roiSlotConfig}
            cctvs={cctvs}
            onClose={() => setIsRoiSettingsOpen(false)}
          />
        ) : null}
      </AppLayout>
    </RequireAuth>
  );
}
