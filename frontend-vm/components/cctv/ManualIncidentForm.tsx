/**
 * 파일 역할: CCTV 영역에서 사용하는 ManualIncidentForm UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, useMemo, useState } from "react";
// 코드 설명: @/types/cctv 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Cctv } from "@/types/cctv";
// 코드 설명: @/types/incident 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type {
  ManualIncidentPayload,
  ManualIncidentRiskLevel,
  ManualIncidentStatus,
  ManualIncidentType,
} from "@/types/incident";

// 코드 설명: incidentTypeOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const incidentTypeOptions: Array<[ManualIncidentType, string]> = [
  ["LANE_STOP", "주행차로 정차"],
  ["SHOULDER_STOP", "갓길 정차"],
  ["OBSTACLE", "낙하물"],
  ["PEDESTRIAN", "보행자 진입"],
  ["WRONG_WAY", "역주행 의심"],
  ["ACCIDENT", "사고 의심"],
  ["ETC", "기타"],
];

// 코드 설명: riskLevelOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const riskLevelOptions: ManualIncidentRiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
// 코드 설명: statusOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusOptions: ManualIncidentStatus[] = ["DETECTED", "REVIEWING"];

// 코드 설명: getLocalDateTimeValue 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getLocalDateTimeValue() {
  // 코드 설명: now 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const now = new Date();
  // 코드 설명: timezoneOffset 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16)
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

// 코드 설명: ManualIncidentForm 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ManualIncidentForm({
  cctv,
  onSubmit,
}: {
  cctv: Cctv;
  onSubmit: (payload: ManualIncidentPayload) => void;
}) {
  // 코드 설명: initialDetectedAt 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const initialDetectedAt = useMemo(() => getLocalDateTimeValue(), []);
  // 코드 설명: [incidentType, setIncidentType] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [incidentType, setIncidentType] = useState<ManualIncidentType>("LANE_STOP");
  // 코드 설명: [riskLevel, setRiskLevel] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [riskLevel, setRiskLevel] = useState<ManualIncidentRiskLevel>("HIGH");
  // 코드 설명: [title, setTitle] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [title, setTitle] = useState("");
  // 코드 설명: [description, setDescription] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [description, setDescription] = useState("");
  // 코드 설명: [detectedAt, setDetectedAt] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [detectedAt, setDetectedAt] = useState(initialDetectedAt);
  // 코드 설명: [status, setStatus] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [status, setStatus] = useState<ManualIncidentStatus>("DETECTED");
  // 코드 설명: [memo, setMemo] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [memo, setMemo] = useState("");
  // 코드 설명: [assignee, setAssignee] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [assignee, setAssignee] = useState("");

  // 코드 설명: resetForm 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function resetForm() {
    // 코드 설명: setIncidentType 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIncidentType("LANE_STOP");
    // 코드 설명: setRiskLevel 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setRiskLevel("HIGH");
    // 코드 설명: setTitle 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setTitle("");
    // 코드 설명: setDescription 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDescription("");
    // 코드 설명: setDetectedAt 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDetectedAt(getLocalDateTimeValue());
    // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setStatus("DETECTED");
    // 코드 설명: setMemo 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setMemo("");
    // 코드 설명: setAssignee 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAssignee("");
  }

  // 코드 설명: handleSubmit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: onSubmit({ incidentType, riskLevel, title, description, detectedAt, sta…
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

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: resetForm();
    resetForm();
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          이벤트 유형
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
          이벤트 제목
          <input value={title} onChange={(event) => setTitle(event.target.value)} required className="h-11 rounded-lg border border-slate-200 bg-white px-3" placeholder="예: 주행차로 정차 탐지" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          감지 시각
          <input type="datetime-local" value={detectedAt} onChange={(event) => setDetectedAt(event.target.value)} required className="h-11 rounded-lg border border-slate-200 bg-white px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          이벤트 상태
          <select value={status} onChange={(event) => setStatus(event.target.value as ManualIncidentStatus)} className="h-11 rounded-lg border border-slate-200 bg-white px-3">
            {statusOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          관리자
          <input value={assignee} onChange={(event) => setAssignee(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3" placeholder="예: 최고관리자" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        이벤트 설명
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} required className="min-h-24 rounded-lg border border-slate-200 bg-white p-3" placeholder="시연용 이벤트 상황을 입력해주세요." />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        관리자 메모
        <textarea value={memo} onChange={(event) => setMemo(event.target.value)} className="min-h-20 rounded-lg border border-slate-200 bg-white p-3" placeholder="선택 입력" />
      </label>
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-500">
        자동 입력: {cctv.cctvCode} · {cctv.roadName} · {cctv.locationName} · {cctv.direction} · sourceType MANUAL
      </div>
      <button type="submit" className="h-11 rounded-lg bg-slate-900 px-4 font-bold text-white transition hover:bg-slate-800">
        수동 이벤트 트리거
      </button>
    </form>
  );
}
