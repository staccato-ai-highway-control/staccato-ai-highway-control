/**
 * 파일 역할: 자료실 영역에서 사용하는 ResourceList UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AlertCircle, FileDown, FilePlus2, RefreshCw, Search } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, useCallback, useEffect, useState } from "react";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/features/resources/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { downloadResourceFile, getResources } from "@/features/resources/api";
// 코드 설명: @/features/resources/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ResourceCategory, ResourceItem } from "@/features/resources/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";
// 코드 설명: ./resourceData 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { formatResourceDate, formatResourceFileSize, resourceCategoryLabels, resourceCategoryOptions, resourceCategoryTone } from "./resourceData";
// 코드 설명: ./resourcePermissions 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { isResourceAdmin } from "./resourcePermissions";

// 코드 설명: PAGE_SIZE 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const PAGE_SIZE = 10;
// 코드 설명: categoryTabs 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const categoryTabs: Array<ResourceCategory | "ALL"> = ["ALL", ...resourceCategoryOptions];

// 코드 설명: ResourceList 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ResourceList() {
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [resources, setResources] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [resources, setResources] = useState<ResourceItem[]>([]);
  // 코드 설명: [category, setCategory] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [category, setCategory] = useState<ResourceCategory | "ALL">("ALL");
  // 코드 설명: [keyword, setKeyword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [keyword, setKeyword] = useState("");
  // 코드 설명: [submittedKeyword, setSubmittedKeyword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  // 코드 설명: [page, setPage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [page, setPage] = useState(1);
  // 코드 설명: [total, setTotal] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [total, setTotal] = useState(0);
  // 코드 설명: [pages, setPages] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [pages, setPages] = useState(1);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");

  // 코드 설명: loadResources 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const loadResources = useCallback(async () => {
    // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await getResources({
        category: category === "ALL" ? undefined : category,
        keyword: submittedKeyword || undefined,
        page,
        size: PAGE_SIZE,
      });
      // 코드 설명: setResources 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setResources(response.items);
      // 코드 설명: setTotal 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setTotal(response.total);
      // 코드 설명: setPages 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setPages(response.pages || 1);
    } catch (error) {
      // 코드 설명: setResources 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setResources([]);
      // 코드 설명: setTotal 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setTotal(0);
      // 코드 설명: setPages 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setPages(1);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "자료 목록을 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(false);
    }
  }, [category, page, submittedKeyword]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
  }, []);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadResources();
    loadResources();
  }, [loadResources]);

  // 코드 설명: handleSearch 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: setSubmittedKeyword 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSubmittedKeyword(keyword.trim());
    // 코드 설명: setPage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setPage(1);
  }

  // 코드 설명: handleDownload 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDownload(resource: ResourceItem) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !resource.file_name
    if (!resource.file_name) return;

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await downloadResourceFile(resource.id, resource.file_name);
      await downloadResourceFile(resource.id, resource.file_name);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "파일 다운로드에 실패했습니다.");
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-sm font-black text-slate-950 no-underline">STACCATO</Link>
            <h1 className="mt-3 text-3xl font-black">자료실</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">STACCATO 프로젝트의 주요 문서와 회의 기록을 관리합니다.</p>
          </div>
          {isResourceAdmin(authUser) ? (
            <Link
              href="/resources/new"
              className="group inline-flex h-11 items-center justify-center gap-2.5 rounded-xl bg-staccato px-5 text-sm font-black text-white no-underline shadow-sm shadow-red-200 transition hover:-translate-y-0.5 hover:bg-staccato-dark hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 transition group-hover:bg-white/20">
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              </span>
              새 자료 등록
            </Link>
          ) : null}
        </header>

        <Card className="mb-5 p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {categoryTabs.map((tab) => {
              // 코드 설명: active 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
              const active = category === tab;
              // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
              return (
                <button key={tab} type="button" onClick={() => { setCategory(tab); setPage(1); }} className={`min-h-10 rounded-lg border px-4 text-sm font-black transition ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {tab === "ALL" ? "전체" : resourceCategoryLabels[tab]}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
            <span className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="제목, 작성자, 설명, 파일명 검색" className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400" />
            </span>
            <button type="submit" className="h-11 rounded-lg border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition hover:bg-slate-50">검색</button>
          </form>
        </Card>

        {errorMessage ? (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <div>
                <p className="font-black">자료 목록을 불러오지 못했습니다.</p>
                <p className="mt-1 font-semibold text-red-700">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadResources}
              disabled={loading}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              다시 시도
            </button>
          </div>
        ) : null}

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-black text-slate-950">자료 목록</h2>
            <span className="text-sm font-semibold text-slate-500">{loading ? "불러오는 중" : `${total}건 · ${page}페이지`}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-[28%] px-3 py-3">제목</th>
                  <th className="w-36 px-3 py-3">카테고리</th>
                  <th className="w-28 px-3 py-3">작성자</th>
                  <th className="w-36 px-3 py-3">등록일</th>
                  <th className="w-48 px-3 py-3">첨부파일</th>
                  <th className="w-36 px-3 py-3">보기/다운로드</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id} className="border-t border-slate-100">
                    <td className="px-3 py-4"><Link href={`/resources/${resource.id}`} className="block truncate font-black text-slate-950 no-underline hover:text-sky-700">{resource.title}</Link></td>
                    <td className="px-3 py-4"><Badge tone={resourceCategoryTone[resource.category]}>{resource.category_label || resourceCategoryLabels[resource.category]}</Badge></td>
                    <td className="truncate px-3 py-4 font-semibold text-slate-600">{resource.author_name}</td>
                    <td className="truncate px-3 py-4 font-semibold text-slate-500">{formatResourceDate(resource.created_at)}</td>
                    <td className="px-3 py-4">{resource.file_name ? <><span className="block truncate font-semibold text-slate-600">{resource.file_name}</span><span className="text-xs font-semibold text-slate-400">{formatResourceFileSize(resource.file_size ?? 0)}</span></> : <span className="text-xs font-semibold text-slate-400">첨부 없음</span>}</td>
                    <td className="px-3 py-4">
                      <div className="flex flex-nowrap justify-end gap-1 whitespace-nowrap">
                        <Link href={`/resources/${resource.id}`} className="inline-flex min-h-8 items-center rounded-md border border-slate-200 px-2 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">보기</Link>
                        {resource.file_name ? (
                          <button type="button" onClick={() => handleDownload(resource)} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-sky-200 px-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50">
                            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                            다운로드
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && resources.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-sm font-semibold text-slate-500">등록된 자료가 없습니다.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">이전</button>
            <span className="text-xs font-bold text-slate-500">10개 단위 · {page} / {pages}</span>
            <button type="button" disabled={loading || page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">다음</button>
          </div>
        </Card>
      </section>
    </main>
  );
}
