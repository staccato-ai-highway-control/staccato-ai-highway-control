/**
 * 파일 역할: 관리자 / 게시판 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FilePlus, Search, Trash2 } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useState } from "react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Button 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Button } from "@/components/common/Button";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/features/board/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getBoardPosts, deleteBoardPost } from "@/features/board/api";
// 코드 설명: @/features/board/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { BoardPost } from "@/features/board/types";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";
// 코드 설명: ./data 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
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

// 코드 설명: categoryOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const categoryOptions: Array<BoardCategory | "ALL"> = ["ALL", "NOTICE", "REFERENCE", "DISCUSSION"];
// 코드 설명: PAGE_SIZE 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const PAGE_SIZE = 10;

// 코드 설명: getErrorMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getErrorMessage(error: unknown) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: error instanceof Error ? error.message : "게시글 목록을 불러오지 못했습니다."
  return error instanceof Error ? error.message : "게시글 목록을 불러오지 못했습니다.";
}

// 코드 설명: AdminBoardPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function AdminBoardPage() {
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [posts, setPosts] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [posts, setPosts] = useState<BoardPost[]>([]);
  // 코드 설명: [categoryFilter, setCategoryFilter] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [categoryFilter, setCategoryFilter] = useState<BoardCategory | "ALL">("ALL");
  // 코드 설명: [query, setQuery] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [query, setQuery] = useState("");
  // 코드 설명: [page, setPage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [page, setPage] = useState(1);
  // 코드 설명: [hasNextPage, setHasNextPage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [hasNextPage, setHasNextPage] = useState(false);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 코드 설명: [deletingId, setDeletingId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 코드 설명: loadPosts 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadPosts(nextPage = page) {
    // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: nextPosts 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextPosts = await getBoardPosts({
        page: nextPage,
        size: PAGE_SIZE,
        keyword: query.trim() || undefined,
        board_type: categoryFilter === "ALL" ? undefined : categoryFilter,
      });
      // 코드 설명: setPosts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setPosts(nextPosts);
      // 코드 설명: setHasNextPage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setHasNextPage(nextPosts.length === PAGE_SIZE);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(getErrorMessage(error));
      // 코드 설명: setPosts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setPosts([]);
      // 코드 설명: setHasNextPage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setHasNextPage(false);
    } finally {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(false);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
  }, []);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadPosts(page);
    loadPosts(page);
  }, [page, categoryFilter, query]);

  // 코드 설명: visiblePosts 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const visiblePosts = useMemo(() => {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: posts .filter((post) => post.post_status !== "DELETED") .sort((a, b) =>…
    return posts
      .filter((post) => post.post_status !== "DELETED")
      .sort((a, b) => b.is_pinned - a.is_pinned || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [posts]);

  // 코드 설명: handleDelete 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDelete(post: BoardPost) {
    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm("게시글을 삭제하시겠습니까?");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: setDeletingId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDeletingId(post.id);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await deleteBoardPost(post.id);
      await deleteBoardPost(post.id);
      // 코드 설명: nextPosts 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextPosts = posts.filter((item) => item.id !== post.id);
      // 코드 설명: setPosts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setPosts(nextPosts);
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: nextPosts.length === 0 && page > 1
      if (nextPosts.length === 0 && page > 1) setPage((current) => Math.max(1, current - 1));
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "게시글 삭제에 실패했습니다.");
    } finally {
      // 코드 설명: setDeletingId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDeletingId(null);
    }
  }

  // 코드 설명: canWritePost 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canWritePost = canCreatePost(authUser);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
                  // 코드 설명: setCategoryFilter 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
                  setCategoryFilter(event.target.value as BoardCategory | "ALL");
                  // 코드 설명: setPage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
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
                    // 코드 설명: setQuery 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
                    setQuery(event.target.value);
                    // 코드 설명: setPage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
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
                  // 코드 설명: category 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const category = getBoardCategory(post.board_type);
                  // 코드 설명: editable 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const editable = canEditPost(post, authUser);
                  // 코드 설명: deletable 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const deletable = canDeletePost(post, authUser);

                  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
