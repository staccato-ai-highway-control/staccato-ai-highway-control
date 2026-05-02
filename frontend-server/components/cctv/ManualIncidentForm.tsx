"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Cctv } from "@/types/cctv";
import type {
  ManualIncidentPayload,
  ManualIncidentRiskLevel,
  ManualIncidentStatus,
  ManualIncidentType,
} from "@/types/incident";

const incidentTypeOptions: Array<[ManualIncidentType, string]> = [
  ["LANE_STOP", "주행차로 정차"],
  ["SHOULDER_STOP", "갓길 정차"],
  ["OBSTACLE", "낙하물"],
  ["PEDESTRIAN", "보행자 진입"],
  ["WRONG_WAY", "역주행 의심"],
  ["ACCIDENT", "사고 의심"],
  ["ETC", "기타"],
];

const riskLevelOptions: ManualIncidentRiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statusOptions: ManualIncidentStatus[] = ["DETECTED", "REVIEWING"];

function getLocalDateTimeValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function ManualIncidentForm({
  cctv,
  onSubmit,
}: {
  cctv: Cctv;
  onSubmit: (payload: ManualIncidentPayload) => void;
}) {
  const initialDetectedAt = useMemo(() => getLocalDateTimeValue(), []);
  const [incidentType, setIncidentType] = useState<ManualIncidentType>("LANE_STOP");
  const [riskLevel, setRiskLevel] = useState<ManualIncidentRiskLevel>("HIGH");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detectedAt, setDetectedAt] = useState(initialDetectedAt);
  const [status, setStatus] = useState<ManualIncidentStatus>("DETECTED");
  const [memo, setMemo] = useState("");
  const [assignee, setAssignee] = useState("");

  function resetForm() {
    setIncidentType("LANE_STOP");
    setRiskLevel("HIGH");
    setTitle("");
    setDescription("");
    setDetectedAt(getLocalDateTimeValue());
    setStatus("DETECTED");
    setMemo("");
    setAssignee("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      incidentType,
      riskLevel,
      title,
      description,
      detectedAt,
      status,
      cctvId: cctv.id,
      cctvCode: cctv.cctvCode,
      roadName: cctv.roadName,
      locationName: cctv.locationName,
      direction: cctv.direction,
      sourceType: "MANUAL",
      memo: memo || undefined,
      assignee: assignee || undefined,
      createdBy: "김관제",
    });

    resetForm();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          사고 유형
          <select value={incidentType} onChange={(event) => setIncidentType(event.target.value as ManualIncidentType)} className="h-11 rounded-lg border border-slate-200 bg-white px-3">
            {incidentTypeOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          위험도
          <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as ManualIncidentRiskLevel)} className="h-11 rounded-lg border border-slate-200 bg-white px-3">
            {riskLevelOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          사고 제목
          <input value={title} onChange={(event) => setTitle(event.target.value)} required className="h-11 rounded-lg border border-slate-200 bg-white px-3" placeholder="예: 주행차로 정차 의심" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          감지 시각
          <input type="datetime-local" value={detectedAt} onChange={(event) => setDetectedAt(event.target.value)} required className="h-11 rounded-lg border border-slate-200 bg-white px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          처리 상태
          <select value={status} onChange={(event) => setStatus(event.target.value as ManualIncidentStatus)} className="h-11 rounded-lg border border-slate-200 bg-white px-3">
            {statusOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          담당자
          <input value={assignee} onChange={(event) => setAssignee(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3" placeholder="예: 김관제" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        사고 설명
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} required className="min-h-24 rounded-lg border border-slate-200 bg-white p-3" placeholder="사고 상황을 입력해주세요." />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        관리자 메모
        <textarea value={memo} onChange={(event) => setMemo(event.target.value)} className="min-h-20 rounded-lg border border-slate-200 bg-white p-3" placeholder="선택 입력" />
      </label>
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-500">
        자동 입력: {cctv.cctvCode} · {cctv.roadName} · {cctv.locationName} · {cctv.direction} · sourceType MANUAL
      </div>
      <button type="submit" className="h-11 rounded-lg bg-slate-900 px-4 font-bold text-white transition hover:bg-slate-800">
        수동 사고 등록
      </button>
    </form>
  );
}
