/**
 * 파일 역할: 관리자 / security-logs 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Fragment, useCallback, useEffect, useState } from "react";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Download, RefreshCw, ShieldCheck } from "lucide-react";
// 코드 설명: @/components/auth/RequireSuperAdmin 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/features/resources/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import {
  downloadResourceFile,
  getSecurityLogResources,
} from "@/features/resources/api";
// 코드 설명: @/features/resources/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ResourceItem } from "@/features/resources/types";

const PAGE_SIZE = 10;

// 코드 설명: formatDate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatDate(value?: string | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "-";

  // 코드 설명: date 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const date = new Date(value);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Number.isNaN(date.getTime())
  if (Number.isNaN(date.getTime())) return value;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: …
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 코드 설명: formatFileSize 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatFileSize(size?: number | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !size
  if (!size) return "-";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: size < 1024
  if (size < 1024) return `${size} B`;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: size < 1024 * 1024
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

// 코드 설명: SecurityLogsPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function SecurityLogsPage() {
  // 코드 설명: [logs, setLogs] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [logs, setLogs] = useState<ResourceItem[]>([]);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | number | null>(null);

  // 코드 설명: loadLogs 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const loadLogs = useCallback(async () => {
    // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await getSecurityLogResources({
        page: 1,
        size: 1000,
      });

      // 코드 설명: setLogs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLogs(response.items ?? []);
      setExpandedLogId(null);
      setPage(1);
    } catch (error) {
      // 코드 설명: setLogs 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLogs([]);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "보안 로그를 불러오지 못했습니다."
      );
    } finally {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(false);
    }
  }, []);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadLogs();
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const visibleLogs = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 코드 설명: handleDownload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const handleDownload = async (log: ResourceItem) => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !log.file_name
    if (!log.file_name) return;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await downloadResourceFile(log.id, log.file_name);
    await downloadResourceFile(log.id, log.file_name);
  };

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
                    {visibleLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id;

                      return (
                        <Fragment key={log.id}>
                          <tr className="border-b border-slate-100 text-sm">
                            <td className="max-w-[360px] px-5 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedLogId((current) =>
                                    current === log.id ? null : log.id
                                  )
                                }
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

                          {isExpanded ? (
                            <tr
                              id={`security-log-detail-${log.id}`}
                              className="border-b border-slate-100 bg-sky-50/50 last:border-b-0"
                            >
                              <td colSpan={6} className="px-5 py-4">
                                <div className="rounded-xl border border-sky-100 bg-white px-4 py-3">
                                  <p className="text-xs font-black text-sky-700">
                                    상세 내용
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-700">
                                    {log.description?.trim() ||
                                      "등록된 상세 내용이 없습니다."}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && !errorMessage && logs.length > 0 ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">이전</button>
                <span className="text-xs font-bold text-slate-500">10개 단위 · {page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">다음</button>
              </div>
            ) : null}
          </section>
        </main>
      </AppLayout>
    </RequireSuperAdmin>
  );
}