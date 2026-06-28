"use client";

import type { FormEvent } from "react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { downloadResourceFile, getSecurityLogResources } from "@/features/resources/api";
import type { ResourceItem } from "@/features/resources/types";

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function SecurityLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<ResourceItem["id"] | null>(null);

  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage("");
    try {
      const response = await getSecurityLogResources({ page: 1, size: 1000, keyword: submittedKeyword || undefined });
      setLogs(response.items ?? []);
      const nextPages = Math.max(1, Math.ceil((response.items?.length ?? 0) / PAGE_SIZE));
      setPage((current) => Math.min(current, nextPages));
    } catch (error) {
      if (!silent) setLogs([]);
      setErrorMessage(error instanceof Error ? error.message : "보안 로그를 불러오지 못했습니다.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [submittedKeyword]);

  useEffect(() => {
    void loadLogs();
    const timer = window.setInterval(() => void loadLogs(true), 5000);
    return () => window.clearInterval(timer);
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const visibleLogs = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedKeyword(keyword.trim());
    setPage(1);
  }

  async function handleDownload(log: ResourceItem) {
    if (!log.file_name || log.allowed_actions?.download !== true) return;
    try { await downloadResourceFile(log.id, log.file_name); } catch { setErrorMessage("파일 다운로드에 실패했습니다."); }
  }

  function openDetail(id: ResourceItem["id"]) {
    router.push(`/security-logs/${id}`);
  }

  return (
    <RequireSuperAdmin title="보안 로그">
      <AppLayout title="보안 로그">
        <main className="mx-auto w-full max-w-7xl px-6 py-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div><div className="mb-2 flex items-center gap-2"><h2 className="text-2xl font-black text-slate-950">보안 로그</h2><span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">관리자 전용</span></div><p className="text-sm font-semibold text-slate-500">접속 로그와 자동 점검 리포트를 확인할 수 있습니다.</p></div>
            <button type="button" onClick={() => void loadLogs()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />새로고침</button>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div><h3 className="text-base font-black text-slate-950">접속 로그 목록</h3><p className="mt-1 text-xs font-semibold text-slate-500">ACCESS_LOG 카테고리의 자료만 표시합니다.</p></div>
              <form onSubmit={handleSearch} className="flex w-full gap-2 sm:max-w-md"><span className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100"><Search className="h-4 w-4 text-slate-400" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="보안 로그 검색" className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none" /></span><button type="submit" className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-black text-white hover:bg-slate-700">검색</button></form>
            </div>
            <div className="border-b border-slate-100 px-5 py-3 text-right text-sm font-black text-slate-500">{logs.length}건</div>

            {loading ? <div className="flex min-h-[220px] items-center justify-center text-sm font-bold text-slate-500">보안 로그를 불러오는 중입니다.</div> : errorMessage ? <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center"><ShieldCheck className="h-8 w-8 text-amber-600" /><p className="text-base font-black text-slate-950">보안 로그를 불러오지 못했습니다.</p><p className="text-sm font-semibold text-slate-500">{errorMessage}</p><button type="button" onClick={() => void loadLogs()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">다시 불러오기</button></div> : logs.length === 0 ? <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center"><ShieldCheck className="h-8 w-8 text-slate-400" /><p className="text-base font-black text-slate-950">표시할 보안 로그가 없습니다.</p></div> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[960px] border-collapse"><thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-black text-slate-500"><th className="px-5 py-3">제목</th><th className="px-5 py-3">카테고리</th><th className="px-5 py-3">작성자</th><th className="px-5 py-3">생성일</th><th className="px-5 py-3">첨부파일</th><th className="px-5 py-3 text-right">다운로드</th></tr></thead><tbody>
  {visibleLogs.map((log) => {
    const isExpanded = expandedLogId === log.id;

    return (
      <Fragment key={log.id}>
        <tr
          tabIndex={0}
          role="link"
          onClick={() => openDetail(log.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openDetail(log.id);
            }
          }}
          className="cursor-pointer border-b border-slate-100 text-sm transition hover:bg-sky-50/60 focus:bg-sky-50 focus:outline-none"
        >
          <td className="max-w-[360px] px-5 py-4">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setExpandedLogId((current) =>
                  current === log.id ? null : log.id
                );
              }}
              onKeyDown={(event) => event.stopPropagation()}
              aria-expanded={isExpanded}
              aria-controls={`security-log-detail-${log.id}`}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="truncate font-black text-slate-950 underline-offset-4 hover:text-sky-700 hover:underline">
                {log.title}
              </span>
              <span className="shrink-0 text-xs font-black text-sky-700">
                {isExpanded ? "접기" : "상세 보기"}
              </span>
            </button>

            {log.description ? (
              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                {log.description}
              </p>
            ) : null}
          </td>

          <td className="px-5 py-4">
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
              {log.category_label ?? "접속 로그"}
            </span>
          </td>

          <td className="px-5 py-4 font-bold text-slate-700">
            {log.author_name ?? "-"}
          </td>

          <td className="px-5 py-4 font-bold text-slate-600">
            {formatDate(log.created_at)}
          </td>

          <td className="max-w-[240px] px-5 py-4">
            {log.file_name ? (
              <>
                <p className="truncate font-black text-slate-700">
                  {log.file_name}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {formatFileSize(log.file_size)}
                </p>
              </>
            ) : (
              <span className="text-xs font-bold text-slate-400">
                첨부 없음
              </span>
            )}
          </td>

          <td className="px-5 py-4 text-right">
            {log.file_name && log.allowed_actions?.download === true ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDownload(log);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-sky-200 px-3 text-xs font-black text-sky-700 hover:bg-sky-50"
              >
                <Download className="h-4 w-4" />
                다운로드
              </button>
            ) : (
              <span className="text-xs font-bold text-slate-400">-</span>
            )}
          </td>
        </tr>

        {isExpanded ? (
          <tr
            id={`security-log-detail-${log.id}`}
            className="border-b border-slate-100 bg-sky-50/50"
          >
            <td colSpan={6} className="px-5 py-4">
              <div className="rounded-xl border border-sky-100 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-black text-sky-700">상세 내용</p>
                  <button
                    type="button"
                    onClick={() => openDetail(log.id)}
                    className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-black text-sky-700 hover:bg-sky-50"
                  >
                    상세 페이지 열기
                  </button>
                </div>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-700">
                  {log.description?.trim() || "등록된 상세 내용이 없습니다."}
                </p>
              </div>
            </td>
          </tr>
        ) : null}
      </Fragment>
    );
  })}
</tbody></table></div>
            )}
            {!loading && !errorMessage && logs.length > 0 ? <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">이전</button><span className="text-xs font-bold text-slate-500">10개 단위 · {page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">다음</button></div> : null}
          </section>
        </main>
      </AppLayout>
    </RequireSuperAdmin>
  );
}
