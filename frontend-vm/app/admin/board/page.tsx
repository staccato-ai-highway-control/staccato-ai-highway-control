"use client";

import Link from "next/link";
import { FilePlus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import {
  boardPosts,
  categoryLabels,
  categoryTone,
  type AdminBoardPost,
  type BoardCategory,
} from "./data";

const categoryOptions: Array<BoardCategory | "ALL"> = [
  "ALL",
  "NOTICE",
  "RESOURCE",
  "DISCUSSION",
];

export default function AdminBoardPage() {
  const [posts, setPosts] = useState<AdminBoardPost[]>(boardPosts);
  const [categoryFilter, setCategoryFilter] = useState<BoardCategory | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesCategory = categoryFilter === "ALL" || post.category === categoryFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.author.toLowerCase().includes(normalizedQuery) ||
        post.content.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [posts, categoryFilter, query]);

  function handleDelete(id: string) {
    const confirmed = window.confirm("게시글을 삭제하시겠습니까?");
    if (!confirmed) return;

    setPosts((current) => current.filter((post) => post.id !== id));
  }

  return (
    <RequireAuth>
      <AppLayout title="관리자 게시판">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">관리자 게시판</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              공지, 자료, 토론 게시글을 관리합니다.
            </p>
          </div>
          <Link href="/admin/board/new" className="no-underline">
            <Button type="button" className="gap-2">
              <FilePlus className="h-4 w-4" />
              게시글 작성
            </Button>
          </Link>
        </section>

        <Card className="mb-5 p-5">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">카테고리</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as BoardCategory | "ALL")}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category === "ALL" ? "전체" : categoryLabels[category]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">검색</span>
              <span className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="제목, 작성자, 내용 검색..."
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                />
              </span>
            </label>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-black text-slate-950">게시글 목록</h3>
            <span className="text-sm font-semibold text-slate-500">{filteredPosts.length}건</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[980px] table-fixed text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-24 px-4 py-3">카테고리</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="w-40 px-4 py-3">작성자</th>
                  <th className="w-40 px-4 py-3">작성일</th>
                  <th className="w-20 px-4 py-3">조회</th>
                  <th className="w-56 px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="border-t border-slate-100">
                    <td className="px-4 py-4">
                      <Badge tone={categoryTone[post.category]}>{categoryLabels[post.category]}</Badge>
                    </td>
                    <td className="truncate px-4 py-4 font-black text-slate-950">
                      <Link href={`/admin/board/${post.id}`} className="text-slate-950 no-underline hover:text-sky-700">
                        {post.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{post.author}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-500">{post.createdAt}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-500">{post.views}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                        <Link
                          href={`/admin/board/${post.id}`}
                          className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50"
                        >
                          상세
                        </Link>
                        <Link
                          href={`/admin/board/${post.id}/edit`}
                          className="inline-flex min-h-9 items-center rounded-lg border border-sky-200 px-3 text-xs font-bold text-sky-700 no-underline transition hover:bg-sky-50"
                        >
                          수정
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
