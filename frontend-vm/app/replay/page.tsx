"use client";

import { Camera, FileVideo, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { fetchReplay, fetchReplays } from "@/features/replays/api";
import type { ReplayItem, ReplayListResponse } from "@/features/replays/types";

type BadgeTone = "slate" | "blue" | "green" | "amber" | "red";

const sourceOptions = ["", "REPORT", "STREAM", "UNKNOWN"];
const riskOptions = ["", "LOW", "MEDIUM", "HIGH"];
const statusOptions = ["", "DETECTED", "REVIEWING", "RESOLVED"];

const sourceLabels: Record<string, string> = {
  REPORT: "신고 기반",
  STREAM: "실시간 감지",
  UNKNOWN: "출처 미확인",
};

function getTone(value?: string | null): BadgeTone {
  if (!value) return "slate";
  if (["HIGH", "CRITICAL"].includes(value)) return "red";
  if (["MEDIUM", "REVIEWING", "DETECTED"].includes(value)) return "amber";
  if (["LOW", "RESOLVED", "REPORT"].includes(value)) return "green";
  if (["STREAM"].includes(value)) return "blue";
  return "slate";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function optionLabel(value: string, fallback: string) {
  if (!value) return fallback;
  return sourceLabels[value] ?? value;
}

function getReplayMediaUrl(replay?: ReplayItem | null) {
  return replay?.replay_url ?? replay?.attachment?.file_url ?? null;
}

export default function ReplayPage() {
  const [result, setResult] = useState<ReplayListResponse>({ items: [], page: 1, size: 20, total_count: 0, total_pages: 0 });
  const [selectedReplay, setSelectedReplay] = useState<ReplayItem | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sourceType, setSourceType] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadReplays(nextPage = page) {
    setLoading(true);
    setErrorMessage(null);

    try {
      const nextResult = await fetchReplays({
        page: nextPage,
        size: 20,
        source_type: sourceType || undefined,
        risk_level: riskLevel || undefined,
        status: status || undefined,
        keyword: keyword.trim() || undefined,
      });
      setResult(nextResult);
      const first = nextResult.items[0] ?? null;
      setSelectedId((current) => current ?? first?.incident_id ?? null);
      setSelectedReplay((current) => current ?? first);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "리플레이 목록을 불러오지 못했습니다.");
      setResult((current) => ({ ...current, items: [] }));
      setSelectedReplay(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadReplayDetail(incidentId: number) {
    setDetailLoading(true);
    setErrorMessage(null);

    try {
      setSelectedReplay(await fetchReplay(incidentId));
      setSelectedId(incidentId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "리플레이 상세를 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadReplays(page);
  }, [page, sourceType, riskLevel, status]);

  function handleSearch() {
    setPage(1);
    setSelectedId(null);
    setSelectedReplay(null);
    loadReplays(1);
  }

  const selectedFromList = useMemo(() => {
    return result.items.find((item) => item.incident_id === selectedId) ?? result.items[0] ?? null;
  }, [result.items, selectedId]);
  const activeReplay = selectedReplay ?? selectedFromList;
  const mediaUrl = getReplayMediaUrl(activeReplay);
  const snapshotUrl = activeReplay?.snapshot_url ?? null;

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
              {activeReplay ? <dl className="mt-4 grid gap-2 text-xs font-semibold text-slate-500"><div>탐지 시각: {formatDate(activeReplay.detected_at)}</div><div>위치: {activeReplay.road_name ?? "-"} {activeReplay.location_name ?? ""}</div><div>상태: {activeReplay.status}</div></dl> : null}
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
                    <span className="mt-1 block text-xs font-semibold opacity-75">{formatDate(item.detected_at)} · {sourceLabels[item.source_type] ?? item.source_type}</span>
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
