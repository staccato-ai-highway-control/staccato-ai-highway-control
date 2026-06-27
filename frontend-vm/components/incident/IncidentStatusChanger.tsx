"use client";

import { useState } from "react";
import { updateIncidentStatus } from "@/features/incidents/api";
import { incidentStatusLabels, type IncidentStatus } from "@/features/incidents/types";

const statuses: IncidentStatus[] = ["DETECTED", "REVIEWING", "ASSIGNED", "RESOLVED", "FALSE_POSITIVE", "CLOSED"];

type IncidentStatusChangerProps = {
  incidentId: string;
  initialStatus: IncidentStatus;
};

export function IncidentStatusChanger({ incidentId, initialStatus }: IncidentStatusChangerProps) {
  const [status, setStatus] = useState(initialStatus);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingStatus, setPendingStatus] = useState<IncidentStatus | null>(null);

  async function handleStatusChange(nextStatus: IncidentStatus) {
    setErrorMessage("");
    setPendingStatus(nextStatus);

    try {
      await updateIncidentStatus(incidentId, nextStatus);
      setStatus(nextStatus);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
    } finally {
      setPendingStatus(null);
    }
  }

  return (
    <div className="grid gap-2">
      {statuses.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => handleStatusChange(item)}
          disabled={pendingStatus !== null}
          className={`min-h-10 rounded-xl border px-3 py-2 text-left text-sm font-bold transition disabled:opacity-60 ${
            status === item ? "border-blue-600 bg-blue-600 text-white" : item === "FALSE_POSITIVE" ? "border-red-200 bg-white text-red-700 hover:bg-red-50" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {pendingStatus === item ? "변경 중..." : incidentStatusLabels[item]}
        </button>
      ))}
      {errorMessage ? <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
