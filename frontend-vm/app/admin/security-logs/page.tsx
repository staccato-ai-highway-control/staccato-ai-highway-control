"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, ShieldCheck } from "lucide-react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  downloadResourceFile,
  getSecurityLogResources,
} from "@/features/resources/api";
import type { ResourceItem } from "@/features/resources/types";

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await getSecurityLogResources({
        page: 1,
        size: 20,
      });

      setLogs(response.items ?? []);
    } catch (error) {
      setLogs([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "보안 로그를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleDownload = async (log: ResourceItem) => {
    if (!log.file_name) return;
    await downloadResourceFile(log.id, log.file_name);
  };

  return (
    <RequireSuperAdmin title="보안 로그">
      <AppLayout title="보안 로그">
        <main className="mx-auto w-full max-w-7xl px-6 py-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-950">
                  보안 로그
                </h2>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                  API 연결
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-500">
                접속 로그와 자동 점검 리포트를 확인할 수 있습니다.
              </p>
            </div>

            <button
              type="button"
              onClick={loadLogs}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-black text-slate-950">
                  접속 로그 목록
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  ACCESS_LOG 카테고리의 자료만 표시합니다.
                </p>
              </div>
              <span className="text-sm font-black text-slate-500">
                {logs.length}건
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm font-bold text-slate-500">
                보안 로그를 불러오는 중입니다.
              </div>
            ) : errorMessage ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-base font-black text-slate-950">
                    보안 로그를 불러오지 못했습니다.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {errorMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadLogs}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  다시 불러오기
                </button>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-base font-black text-slate-950">
                    표시할 보안 로그가 없습니다.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    접속 로그 리포트가 생성되면 이곳에서 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-black text-slate-500">
                      <th className="px-5 py-3">제목</th>
                      <th className="px-5 py-3">카테고리</th>
                      <th className="px-5 py-3">작성자</th>
                      <th className="px-5 py-3">생성일</th>
                      <th className="px-5 py-3">첨부파일</th>
                      <th className="px-5 py-3 text-right">다운로드</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-100 text-sm last:border-b-0"
                      >
                        <td className="max-w-[360px] px-5 py-4">
                          <p className="truncate font-black text-slate-950">
                            {log.title}
                          </p>
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
                          {log.file_name ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(log)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-3 text-xs font-black text-sky-700 transition hover:bg-sky-50"
                            >
                              <Download className="h-4 w-4" />
                              다운로드
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </AppLayout>
    </RequireSuperAdmin>
  );
}