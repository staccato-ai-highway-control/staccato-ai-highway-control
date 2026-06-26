"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { fetchBugReports } from "@/features/bug-reports/api";
import type { BugReport } from "@/features/bug-reports/types";

const statusLabels: Record<string, string> = {
  OPEN: "열림",
  IN_PROGRESS: "처리중",
  RESOLVED: "해결",
  CLOSED: "닫힘",
};

function badgeTone(value?: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (!value) return "slate";
  if (["CRITICAL", "HIGH"].includes(value)) return "red";
  if (["MAJOR", "IN_PROGRESS", "MEDIUM"].includes(value)) return "amber";
  if (["RESOLVED", "CLOSED", "LOW"].includes(value)) return "green";
  if (["OPEN", "MINOR"].includes(value)) return "blue";
  return "slate";
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function BugReportList() {
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [reports, setReports] = useState<BugReport[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetchBugReports({
        keyword: submittedKeyword.trim() || undefined,
        page,
        size: 10,
      });
      setReports(response.items);
      setTotalCount(response.total_count);
      setTotalPages(response.total_pages || 1);
    } catch {
      setReports([]);
      setTotalCount(0);
      setErrorMessage("버그리포트 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, submittedKeyword]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedKeyword(keyword);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">STACCATO</p>
            <h1 className="mt-3 text-3xl font-black">버그리포트</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              서비스 이용 중 발견한 오류나 개선 요청을 공개로 등록할 수 있습니다.
            </p>
          </div>

          <Link
            href="/bug-reports/new"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-black text-white no-underline shadow-sm transition hover:bg-red-700"
          >
            버그리포트 등록하기
          </Link>
        </header>

        <form onSubmit={handleSearch} className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="제목, 설명 검색"
              className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
            <button type="submit" className="h-11 rounded-lg border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition hover:bg-slate-50">
              검색
            </button>
          </div>
        </form>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-black">버그리포트 목록</h2>
            <span className="text-sm font-black text-slate-500">{totalCount}건</span>
          </div>

          {loading ? <div className="p-10 text-center text-sm font-bold text-slate-500">버그리포트 목록을 불러오는 중입니다.</div> : null}

          {!loading && errorMessage ? (
            <div className="p-10 text-center">
              <p className="text-sm font-bold text-red-700">{errorMessage}</p>
            </div>
          ) : null}

          {!loading && !errorMessage && reports.length === 0 ? (
            <div className="p-10 text-center text-sm font-black text-slate-500">등록된 버그리포트가 없습니다.</div>
          ) : null}

          {!loading && !errorMessage && reports.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {reports.map((report) => (
                <li key={report.id}>
                  <Link href={`/bug-reports/${report.id}`} className="block px-5 py-4 no-underline transition hover:bg-slate-50">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-black text-slate-950">{report.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">
                          {report.description || "설명이 없습니다."}
                        </p>
                        <p className="mt-3 text-xs font-bold text-slate-400">{formatDate(report.created_at)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <Badge tone={badgeTone(report.status)}>{statusLabels[report.status ?? ""] ?? report.status ?? "OPEN"}</Badge>
                        <Badge tone={badgeTone(report.severity)}>{report.severity ?? "MINOR"}</Badge>
                        <Badge tone={badgeTone(report.priority)}>{report.priority ?? "MEDIUM"}</Badge>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {!loading && !errorMessage && totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">이전</button>
              <span className="text-xs font-black text-slate-500">{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">다음</button>
            </div>
          ) : null}
        </Card>
      </section>
    </main>
  );
}
