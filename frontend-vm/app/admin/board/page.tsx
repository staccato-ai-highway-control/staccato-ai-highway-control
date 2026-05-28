"use client";

import Link from "next/link";
import { FilePlus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { getBoardPosts, deleteBoardPost } from "@/features/board/api";
import type { BoardPost } from "@/features/board/types";
import type { AuthUser } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import {
  canCreatePost,
  canDeletePost,
  canEditPost,
  categoryLabels,
  categoryTone,
  formatBoardDate,
  getBoardCategory,
  type BoardCategory,
} from "./data";

const categoryOptions: Array<BoardCategory | "ALL"> = ["ALL", "NOTICE", "REFERENCE", "DISCUSSION"];
const PAGE_SIZE = 10;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "게시글 목록을 불러오지 못했습니다.";
}

export default function AdminBoardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<BoardCategory | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadPosts(nextPage = page) {
    setLoading(true);
    setErrorMessage(null);

    try {
      const nextPosts = await getBoardPosts({
        page: nextPage,
        size: PAGE_SIZE,
        keyword: query.trim() || undefined,
        board_type: categoryFilter === "ALL" ? undefined : categoryFilter,
      });
      setPosts(nextPosts);
      setHasNextPage(nextPosts.length === PAGE_SIZE);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPosts([]);
      setHasNextPage(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  useEffect(() => {
    loadPosts(page);
  }, [page, categoryFilter, query]);

  const visiblePosts = useMemo(() => {
    return posts
      .filter((post) => post.post_status !== "DELETED")
      .sort((a, b) => b.is_pinned - a.is_pinned || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [posts]);

  async function handleDelete(post: BoardPost) {
    const confirmed = window.confirm("게시글을 삭제하시겠습니까?");
    if (!confirmed) return;

    setDeletingId(post.id);
    setErrorMessage(null);

    try {
      await deleteBoardPost(post.id);
      const nextPosts = posts.filter((item) => item.id !== post.id);
      setPosts(nextPosts);
      if (nextPosts.length === 0 && page > 1) setPage((current) => Math.max(1, current - 1));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "게시글 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  const canWritePost = canCreatePost(authUser);

  return (
    <RequireAuth>
      <AppLayout title="관리자 게시판">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">관리자 게시판</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">권한에 따라 공지, 자료, 토론 게시글을 조회하고 관리합니다.</p>
          </div>
          {canWritePost ? (
            <Link href="/admin/board/new" className="no-underline">
              <Button type="button" className="gap-2">
                <FilePlus className="h-4 w-4" />
                게시글 작성
              </Button>
            </Link>
          ) : null}
        </section>

        <Card className="mb-5 p-5">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">카테고리</span>
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value as BoardCategory | "ALL");
                  setPage(1);
                }}
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
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="제목, 작성자 ID, 내용 검색..."
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                />
              </span>
            </label>
          </div>
        </Card>

        {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-black text-slate-950">게시글 목록</h3>
            <span className="text-sm font-semibold text-slate-500">{loading ? "불러오는 중" : `${visiblePosts.length}건 · ${page}페이지`}</span>
          </div>
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-24 px-3 py-3">카테고리</th>
                  <th className="px-3 py-3">제목</th>
                  <th className="w-24 px-3 py-3">작성자</th>
                  <th className="w-[8.5rem] px-3 py-3">작성일</th>
                  <th className="w-16 px-3 py-3">조회</th>
                  <th className="w-36 px-3 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {visiblePosts.map((post) => {
                  const category = getBoardCategory(post.board_type);
                  const editable = canEditPost(post, authUser);
                  const deletable = canDeletePost(post, authUser);

                  return (
                    <tr key={post.id} className="border-t border-slate-100">
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={categoryTone[category]}>{categoryLabels[category]}</Badge>
                          {post.is_pinned === 1 ? <Badge tone="amber">고정</Badge> : null}
                        </div>
                      </td>
                      <td className="px-3 py-4 font-black text-slate-950">
                        <Link href={`/admin/board/${post.id}`} className="block truncate text-slate-950 no-underline hover:text-sky-700">
                          {post.title}
                        </Link>
                      </td>
                      <td className="truncate px-3 py-4 font-semibold text-slate-600">#{post.author_id}</td>
                      <td className="truncate px-3 py-4 font-semibold text-slate-500">{formatBoardDate(post.created_at)}</td>
                      <td className="px-3 py-4 font-semibold text-slate-500">{post.view_count}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-nowrap justify-end gap-1 whitespace-nowrap">
                          <Link href={`/admin/board/${post.id}`} className="inline-flex min-h-8 items-center rounded-md border border-slate-200 px-2 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">
                            상세
                          </Link>
                          {editable ? (
                            <Link href={`/admin/board/${post.id}/edit`} className="inline-flex min-h-8 items-center rounded-md border border-sky-200 px-2 text-xs font-bold text-sky-700 no-underline transition hover:bg-sky-50">
                              수정
                            </Link>
                          ) : null}
                          {deletable ? (
                            <button type="button" onClick={() => handleDelete(post)} disabled={deletingId === post.id} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-red-200 px-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                              <Trash2 className="h-3.5 w-3.5" />
                              삭제
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && visiblePosts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm font-semibold text-slate-500">게시글이 없습니다.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-xs font-bold text-slate-500">10개 단위 · {page}페이지</span>
            <button
              type="button"
              disabled={loading || !hasNextPage}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
