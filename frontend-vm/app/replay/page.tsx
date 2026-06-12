/**
 * 파일 역할: 영상 재생 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Camera, FileVideo, RotateCcw, Search } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useState } from "react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/features/replays/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { fetchReplay, fetchReplays } from "@/features/replays/api";
// 코드 설명: @/features/replays/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ReplayItem, ReplayListResponse } from "@/features/replays/types";
// 코드 설명: @/lib/dateTime 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { formatKstDateTime } from "@/lib/dateTime";
// 코드 설명: @/lib/mediaUrl 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { normalizeMediaUrl } from "@/lib/mediaUrl";

// 코드 설명: BadgeTone 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type BadgeTone = "slate" | "blue" | "green" | "amber" | "red";

// 코드 설명: sourceOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const sourceOptions = ["", "REPORT", "STREAM", "UNKNOWN"];
// 코드 설명: riskOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const riskOptions = ["", "LOW", "MEDIUM", "HIGH"];
// 코드 설명: statusOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusOptions = ["", "DETECTED", "REVIEWING", "RESOLVED"];

// 코드 설명: sourceLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const sourceLabels: Record<string, string> = {
  REPORT: "신고 기반",
  STREAM: "실시간 감지",
  UNKNOWN: "출처 미확인",
};

// 코드 설명: getTone 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getTone(value?: string | null): BadgeTone {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "slate";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["HIGH", "CRITICAL"].includes(value)
  if (["HIGH", "CRITICAL"].includes(value)) return "red";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["MEDIUM", "REVIEWING", "DETECTED"].includes(value)
  if (["MEDIUM", "REVIEWING", "DETECTED"].includes(value)) return "amber";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["LOW", "RESOLVED", "REPORT"].includes(value)
  if (["LOW", "RESOLVED", "REPORT"].includes(value)) return "green";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["STREAM"].includes(value)
  if (["STREAM"].includes(value)) return "blue";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "slate"
  return "slate";
}


// 코드 설명: optionLabel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function optionLabel(value: string, fallback: string) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return fallback;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: sourceLabels[value] ?? value
  return sourceLabels[value] ?? value;
}

// 코드 설명: getReplayMediaUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReplayMediaUrl(replay?: ReplayItem | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: replay?.replay_url ?? replay?.attachment?.file_url ?? null
  return replay?.replay_url ?? replay?.attachment?.file_url ?? null;
}

// 코드 설명: ReplayPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function ReplayPage() {
  // 코드 설명: [result, setResult] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [result, setResult] = useState<ReplayListResponse>({ items: [], page: 1, size: 20, total_count: 0, total_pages: 0 });
  // 코드 설명: [selectedReplay, setSelectedReplay] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [selectedReplay, setSelectedReplay] = useState<ReplayItem | null>(null);
  // 코드 설명: [selectedId, setSelectedId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // 코드 설명: [sourceType, setSourceType] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [sourceType, setSourceType] = useState("");
  // 코드 설명: [riskLevel, setRiskLevel] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [riskLevel, setRiskLevel] = useState("");
  // 코드 설명: [status, setStatus] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [status, setStatus] = useState("");
  // 코드 설명: [keyword, setKeyword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [keyword, setKeyword] = useState("");
  // 코드 설명: [page, setPage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [page, setPage] = useState(1);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [detailLoading, setDetailLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [detailLoading, setDetailLoading] = useState(false);
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 코드 설명: loadReplays 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadReplays(nextPage = page) {
    // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: nextResult 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextResult = await fetchReplays({
        page: nextPage,
        size: 20,
        source_type: sourceType || undefined,
        risk_level: riskLevel || undefined,
        status: status || undefined,
        keyword: keyword.trim() || undefined,
      });
      // 코드 설명: setResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setResult(nextResult);
      // 코드 설명: first 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const first = nextResult.items[0] ?? null;
      // 코드 설명: setSelectedId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSelectedId((current) => current ?? first?.incident_id ?? null);
      // 코드 설명: setSelectedReplay 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSelectedReplay((current) => current ?? first);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "리플레이 목록을 불러오지 못했습니다.");
      // 코드 설명: setResult 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setResult((current) => ({ ...current, items: [] }));
      // 코드 설명: setSelectedReplay 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSelectedReplay(null);
    } finally {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(false);
    }
  }

  // 코드 설명: loadReplayDetail 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadReplayDetail(incidentId: number) {
    // 코드 설명: setDetailLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDetailLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setSelectedReplay 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSelectedReplay(await fetchReplay(incidentId));
      // 코드 설명: setSelectedId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSelectedId(incidentId);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "리플레이 상세를 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setDetailLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDetailLoading(false);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadReplays(page);
    loadReplays(page);
  }, [page, sourceType, riskLevel, status]);

  // 코드 설명: handleSearch 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleSearch() {
    // 코드 설명: setPage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setPage(1);
    // 코드 설명: setSelectedId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedId(null);
    // 코드 설명: setSelectedReplay 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedReplay(null);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadReplays(1);
    loadReplays(1);
  }

  // 코드 설명: selectedFromList 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const selectedFromList = useMemo(() => {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: result.items.find((item) => item.incident_id === selectedId) ?? result.…
    return result.items.find((item) => item.incident_id === selectedId) ?? result.items[0] ?? null;
  }, [result.items, selectedId]);
  // 코드 설명: activeReplay 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const activeReplay = selectedReplay ?? selectedFromList;
  // 코드 설명: mediaUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const mediaUrl = normalizeMediaUrl(getReplayMediaUrl(activeReplay));
  // 코드 설명: snapshotUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const snapshotUrl = normalizeMediaUrl(activeReplay?.snapshot_url ?? null);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <AppLayout title="리플레이">
        <section className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">이벤트 리플레이</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">신고 등록/AI 분석 기반 이벤트와 실시간 CCTV 감지 이벤트를 다시 확인합니다.</p>
        </section>

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
            <div className="relative flex gap-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleSearch(); }} placeholder="사고 코드, 유형, 위치명 검색" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-sky-400" />
              <button type="button" onClick={handleSearch} className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">검색</button>
            </div>
            <select value={sourceType} onChange={(event) => { setSourceType(event.target.value); setPage(1); setSelectedReplay(null); setSelectedId(null); }} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {sourceOptions.map((value) => <option key={value || "ALL_SOURCE"} value={value}>{optionLabel(value, "전체 출처")}</option>)}
            </select>
            <select value={riskLevel} onChange={(event) => { setRiskLevel(event.target.value); setPage(1); setSelectedReplay(null); setSelectedId(null); }} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {riskOptions.map((value) => <option key={value || "ALL_RISK"} value={value}>{value || "전체 위험도"}</option>)}
            </select>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); setSelectedReplay(null); setSelectedId(null); }} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {statusOptions.map((value) => <option key={value || "ALL_STATUS"} value={value}>{value || "전체 상태"}</option>)}
            </select>
          </div>
        </section>

        {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}
        {loading ? <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">리플레이 목록을 불러오는 중입니다.</div> : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950">{activeReplay?.title ?? "이벤트를 선택하세요"}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">{activeReplay ? `${activeReplay.incident_code} · ${activeReplay.cctv_name ?? activeReplay.cctv_id ?? "CCTV 미지정"}` : "이벤트 없음"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeReplay ? <Badge tone={getTone(activeReplay.source_type)}>{sourceLabels[activeReplay.source_type] ?? activeReplay.source_type}</Badge> : null}
                  {activeReplay ? <Badge tone={getTone(activeReplay.risk_level)}>{activeReplay.risk_level}</Badge> : null}
                </div>
              </div>
            </div>
            <div className="grid min-h-[420px] place-items-center bg-slate-950 p-5 text-white">
              {mediaUrl && activeReplay?.has_video ? (
                <video src={mediaUrl} controls className="max-h-[560px] w-full rounded-lg bg-black" />
              ) : (
                <div className="text-center">
                  <FileVideo className="mx-auto h-14 w-14 text-white/80" aria-hidden="true" />
                  <p className="mt-4 text-sm font-black">영상 없음</p>
                  <p className="mt-2 text-xs font-semibold text-white/60">리플레이 영상 URL이 없거나 아직 공개 파일로 제공되지 않았습니다.</p>
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
              <div className="grid aspect-video place-items-center overflow-hidden rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                {snapshotUrl && activeReplay?.has_snapshot ? <img src={snapshotUrl} alt="이벤트 스냅샷" className="h-full w-full object-cover" /> : "Snapshot 없음"}
              </div>
              {activeReplay ? <dl className="mt-4 grid gap-2 text-xs font-semibold text-slate-500"><div>탐지 시각: {formatKstDateTime(activeReplay.detected_at)}</div><div>위치: {activeReplay.road_name ?? "-"} {activeReplay.location_name ?? ""}</div><div>상태: {activeReplay.status}</div></dl> : null}
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-slate-700" aria-hidden="true" />
                <h3 className="font-black text-slate-950">이벤트 목록</h3>
              </div>
              <div className="grid gap-2">
                {result.items.map((item) => (
                  <button key={item.incident_id} type="button" onClick={() => loadReplayDetail(item.incident_id)} disabled={detailLoading} className={`rounded-lg border p-3 text-left transition disabled:opacity-60 ${item.incident_id === activeReplay?.incident_id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                    <b className="block text-sm">{item.incident_code}</b>
                    <span className="mt-1 block text-xs font-semibold opacity-75">{formatKstDateTime(item.detected_at)} · {sourceLabels[item.source_type] ?? item.source_type}</span>
                    <span className="mt-2 flex flex-wrap gap-1"><Badge tone={getTone(item.status)}>{item.status}</Badge><Badge tone={getTone(item.risk_level)}>{item.risk_level}</Badge></span>
                  </button>
                ))}
                {!loading && result.items.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">표시할 리플레이 이벤트가 없습니다.</p> : null}
              </div>
              {result.total_pages > 1 ? (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <button type="button" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">이전</button>
                  <span className="text-xs font-bold text-slate-500">{result.page} / {result.total_pages}</span>
                  <button type="button" disabled={loading || page >= result.total_pages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">다음</button>
                </div>
              ) : null}
            </Card>
          </aside>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
