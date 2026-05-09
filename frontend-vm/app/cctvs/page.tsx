"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { CctvCard } from "@/components/cctv/CctvCard";
import { CctvDetailModal } from "@/components/cctv/CctvDetailModal";
import { mockCctvs } from "@/features/cctvs/mock";
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
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedCctv, setSelectedCctv] = useState<Cctv | null>(null);
  const [manualIncidents, setManualIncidents] = useState<ManualIncident[]>([]);

  const filteredCctvs = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();

    return mockCctvs.filter((cctv) => {
      const matchesStatus = statusFilter === "ALL" || cctv.status === statusFilter;
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        [cctv.cctvCode, cctv.name, cctv.roadName, cctv.locationName, cctv.location]
          .join(" ")
          .toLowerCase()
          .includes(normalizedKeyword);

      return matchesStatus && matchesKeyword;
    });
  }, [searchKeyword, statusFilter]);

  const selectedCctvIndex = selectedCctv
    ? mockCctvs.findIndex((cctv) => cctv.id === selectedCctv.id)
    : -1;

  const selectedCctvIncidents = selectedCctv
    ? manualIncidents.filter((incident) => incident.cctvId === selectedCctv.id)
    : [];

  function handleCreateManualIncident(payload: ManualIncidentPayload) {
    const incident = createManualIncident(payload, manualIncidents.length + 1);

    setManualIncidents((current) => [incident, ...current]);
    window.alert("수동 사고가 등록되었습니다.");
  }

  return (
    <RequireAuth>
      <AppLayout title="CCTV 관제">
      <section className="mb-5">
        <h2 className="text-2xl font-black text-slate-950">CCTV 관제</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          고속도로 CCTV 실시간 모니터링 및 AI 탐지 현황
        </p>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="CCTV ID 또는 위치 검색..."
              className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white"
            />
          </div>
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
        {filteredCctvs.map((cctv, index) => (
          <CctvCard
            key={cctv.id}
            cctv={cctv}
            index={index}
            onSelect={setSelectedCctv}
          />
        ))}
      </section>

      {filteredCctvs.length === 0 ? (
        <p className="mt-8 rounded-lg border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-500">
          검색 조건에 맞는 CCTV가 없습니다.
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
      </AppLayout>
    </RequireAuth>
  );
}
