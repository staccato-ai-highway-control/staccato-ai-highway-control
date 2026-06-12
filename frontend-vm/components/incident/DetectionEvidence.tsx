/**
 * 파일 역할: 돌발 상황 영역에서 사용하는 DetectionEvidence UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useMemo, useState } from "react";
// 코드 설명: @/features/incidents/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Incident } from "@/features/incidents/types";
// 코드 설명: @/lib/mediaUrl 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { normalizeMediaUrl } from "@/lib/mediaUrl";

// 코드 설명: IncidentWithSnapshotFields 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type IncidentWithSnapshotFields = Incident & {
  snapshot_url?: string | null;
  snapshotPath?: string | null;
  snapshot_path?: string | null;
  previewUrl?: string | null;
  preview_url?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  evidenceUrl?: string | null;
  evidence_url?: string | null;
};

// 코드 설명: pickSnapshotUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function pickSnapshotUrl(incident: IncidentWithSnapshotFields) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    incident.snapshotUrl ??
    incident.snapshot_url ??
    incident.snapshotPath ??
    incident.snapshot_path ??
    incident.previewUrl ??
    incident.preview_url ??
    incident.imageUrl ??
    incident.image_url ??
    incident.evidenceUrl ??
    incident.evidence_url ??
    null
  );
}

// 코드 설명: normalizeSnapshotUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeSnapshotUrl(rawUrl?: string | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeMediaUrl(rawUrl)
  return normalizeMediaUrl(rawUrl);
}

// 코드 설명: DetectionEvidence 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function DetectionEvidence({ incident }: { incident: Incident }) {
  // 코드 설명: [imageLoadFailed, setImageLoadFailed] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // 코드 설명: rawSnapshotUrl 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const rawSnapshotUrl = useMemo(() => pickSnapshotUrl(incident as IncidentWithSnapshotFields), [incident]);
  // 코드 설명: snapshotUrl 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const snapshotUrl = useMemo(() => normalizeSnapshotUrl(rawSnapshotUrl), [rawSnapshotUrl]);
  // 코드 설명: canShowImage 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canShowImage = Boolean(snapshotUrl) && !imageLoadFailed;

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative min-h-80 bg-slate-100">
        {canShowImage ? (
          <img
            src={snapshotUrl ?? undefined}
            alt="AI 탐지 증거"
            className="h-80 w-full object-cover"
            onError={() => setImageLoadFailed(true)}
          />
        ) : (
          <div className="flex h-80 w-full flex-col items-center justify-center gap-2 text-slate-500">
            <p className="text-sm font-black">AI 탐지 증거 이미지가 없습니다.</p>
            <p className="text-xs font-semibold">
              이벤트 데이터에 스냅샷 URL이 없거나 이미지 파일을 불러오지 못했습니다.
            </p>
          </div>
        )}


      </div>
    </section>
  );
}
