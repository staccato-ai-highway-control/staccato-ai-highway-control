/**
 * 파일 역할: 버그 신고 영역에서 사용하는 BugReportList UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, useCallback, useEffect, useState } from "react";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/features/bug-reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { fetchBugReports } from "@/features/bug-reports/api";
// 코드 설명: @/features/bug-reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { BugReport } from "@/features/bug-reports/types";

// 코드 설명: statusLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusLabels: Record<string, string> = {
  OPEN: "열림",
  IN_PROGRESS: "처리중",
  RESOLVED: "해결",
  CLOSED: "닫힘",
};

// 코드 설명: badgeTone 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function badgeTone(value?: string): "slate" | "blue" | "green" | "amber" | "red" {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "slate";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["CRITICAL", "HIGH"].includes(value)
  if (["CRITICAL", "HIGH"].includes(value)) return "red";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["MAJOR", "IN_PROGRESS", "MEDIUM"].includes(value)
  if (["MAJOR", "IN_PROGRESS", "MEDIUM"].includes(value)) return "amber";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["RESOLVED", "CLOSED", "LOW"].includes(value)
  if (["RESOLVED", "CLOSED", "LOW"].includes(value)) return "green";
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ["OPEN", "MINOR"].includes(value)
  if (["OPEN", "MINOR"].includes(value)) return "blue";
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "slate"
  return "slate";
}

// 코드 설명: formatDate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatDate(value?: string) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "-";
  // 코드 설명: date 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const date = new Date(value);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Number.isNaN(date.getTime())
  if (Number.isNaN(date.getTime())) return value;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", d…
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// 코드 설명: BugReportList 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function BugReportList() {
  // 코드 설명: [keyword, setKeyword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [keyword, setKeyword] = useState("");
  // 코드 설명: [submittedKeyword, setSubmittedKeyword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  // 코드 설명: [reports, setReports] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [reports, setReports] = useState<BugReport[]>([]);
  // 코드 설명: [page, setPage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [page, setPage] = useState(1);
  // 코드 설명: [totalCount, setTotalCount] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [totalCount, setTotalCount] = useState(0);
  // 코드 설명: [totalPages, setTotalPages] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [totalPages, setTotalPages] = useState(1);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");

  // 코드 설명: loadReports 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const loadReports = useCallback(async () => {
    // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await fetchBugReports({
        keyword: submittedKeyword.trim() || undefined,
        page,
        size: 10,
      });
      // 코드 설명: setReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReports(response.items);
      // 코드 설명: setTotalCount 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setTotalCount(response.total_count);
      // 코드 설명: setTotalPages 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setTotalPages(response.total_pages || 1);
    } catch {
      // 코드 설명: setReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReports([]);
      // 코드 설명: setTotalCount 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setTotalCount(0);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("버그리포트 목록을 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(false);
    }
  }, [page, submittedKeyword]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadReports();
    loadReports();
  }, [loadReports]);

  // 코드 설명: handleSearch 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: setSubmittedKeyword 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSubmittedKeyword(keyword);
    // 코드 설명: setPage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setPage(1);
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
