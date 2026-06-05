"use client";

import Link from "next/link";
import { FileDown, FilePlus, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { AuthUser } from "@/features/auth/types";
import { downloadResourceFile, getResources } from "@/features/resources/api";
import type { ResourceCategory, ResourceItem } from "@/features/resources/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { formatResourceDate, formatResourceFileSize, resourceCategoryLabels, resourceCategoryOptions, resourceCategoryTone } from "./resourceData";
import { isResourceAdmin } from "./resourcePermissions";

const PAGE_SIZE = 10;
const categoryTabs: Array<ResourceCategory | "ALL"> = ["ALL", ...resourceCategoryOptions];

export function ResourceList() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [category, setCategory] = useState<ResourceCategory | "ALL">("ALL");
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadResources = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await getResources({
        category: category === "ALL" ? undefined : category,
        keyword: submittedKeyword || undefined,
        page,
        size: PAGE_SIZE,
      });
      setResources(response.items);
      setTotal(response.total);
      setPages(response.pages || 1);
    } catch (error) {
      setResources([]);
      setTotal(0);
      setPages(1);
      setErrorMessage(error instanceof Error ? error.message : "자료 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [category, page, submittedKeyword]);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedKeyword(keyword.trim());
    setPage(1);
  }

  async function handleDownload(resource: ResourceItem) {
    try {
      await downloadResourceFile(resource.id, resource.file_name);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "파일 다운로드에 실패했습니다.");
    }
  }

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
            <Link href="/resources/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-black text-white no-underline shadow-sm transition hover:bg-slate-800">
              <FilePlus className="h-4 w-4" aria-hidden="true" />
              자료 등록
            </Link>
          ) : null}
        </header>

        <Card className="mb-5 p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {categoryTabs.map((tab) => {
              const active = category === tab;
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

        {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

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
                    <td className="px-3 py-4"><span className="block truncate font-semibold text-slate-600">{resource.file_name}</span><span className="text-xs font-semibold text-slate-400">{formatResourceFileSize(resource.file_size)}</span></td>
                    <td className="px-3 py-4">
                      <div className="flex flex-nowrap justify-end gap-1 whitespace-nowrap">
                        <Link href={`/resources/${resource.id}`} className="inline-flex min-h-8 items-center rounded-md border border-slate-200 px-2 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">보기</Link>
                        <button type="button" onClick={() => handleDownload(resource)} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-sky-200 px-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50">
                          <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                          다운로드
                        </button>
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
