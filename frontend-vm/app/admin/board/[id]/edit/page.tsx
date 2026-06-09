"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { getBoardPost, updateBoardPost } from "@/features/board/api";
import type { BoardPost } from "@/features/board/types";
import type { AuthUser } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { canEditPost, categoryLabels, getBoardCategory, getWritableCategories, isSuperAdmin, type BoardCategory } from "../../data";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "게시글 수정에 실패했습니다.";
}

export default function AdminBoardEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<BoardPost | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [category, setCategory] = useState<BoardCategory>("NOTICE");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  useEffect(() => {
    let disposed = false;

    async function loadPost() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const nextPost = await getBoardPost(id);
        if (disposed) return;
        if (nextPost.post_status === "DELETED") {
          setPost(null);
          setErrorMessage("삭제된 게시글입니다.");
          return;
        }

        setPost(nextPost);
        setCategory(getBoardCategory(nextPost.board_type));
        setTitle(nextPost.title);
        setContent(nextPost.content);
        setIsPinned(nextPost.is_pinned === 1);
      } catch (error) {
        if (!disposed) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    loadPost();
    return () => {
      disposed = true;
    };
  }, [id]);

  const editable = post ? canEditPost(post, authUser) : false;
  const writableCategories = useMemo(() => getWritableCategories(authUser), [authUser]);
  const editableCategories = post ? (writableCategories.includes(getBoardCategory(post.board_type)) ? writableCategories : [getBoardCategory(post.board_type)]) : writableCategories;
  const canPin = isSuperAdmin(authUser);

  useEffect(() => {
    if (!canPin && post) setIsPinned(post.is_pinned === 1);
  }, [canPin, post]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!post || !editable) {
      setErrorMessage("현재 권한으로 수정할 수 없는 게시글입니다.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      setErrorMessage("제목과 내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      await updateBoardPost(id, {
        title: title.trim(),
        content: content.trim(),
        board_type: category,
        is_pinned: canPin ? (isPinned ? 1 : 0) : post.is_pinned,
      });
      router.push(`/admin/board/${id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <RequireAuth>
        <AppLayout title="게시글 수정">
          <Card className="p-8 text-center text-sm font-semibold text-slate-500">게시글을 불러오는 중입니다.</Card>
        </AppLayout>
      </RequireAuth>
    );
  }

  if (!post) {
    return (
      <RequireAuth>
        <AppLayout title="게시글 수정">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-black text-slate-950">게시글을 찾을 수 없습니다.</h2>
            {errorMessage ? <p className="mt-3 text-sm font-semibold text-red-600">{errorMessage}</p> : null}
            <Link href="/admin/board" className="mt-5 inline-flex no-underline">
              <Button type="button">목록으로</Button>
            </Link>
          </Card>
        </AppLayout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppLayout title="게시글 수정">
        <section className="mb-6">
          <Link href={`/admin/board/${id}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            게시글 상세
          </Link>
          <h2 className="mt-3 text-2xl font-black text-slate-950">게시글 수정</h2>
        </section>

        <Card className="p-6">
          {!editable ? <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">현재 권한으로 수정할 수 없는 게시글입니다.</div> : null}
          {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}
          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">카테고리</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as BoardCategory)} disabled={!editable} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400">
                {editableCategories.map((value) => (
                  <option key={value} value={value}>{categoryLabels[value]}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">제목</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={!editable} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">내용</span>
              <textarea value={content} onChange={(event) => setContent(event.target.value)} disabled={!editable} rows={12} className="resize-none rounded-lg border border-slate-200 p-3 text-sm font-semibold leading-7 text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400" />
            </label>

            {canPin ? (
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} disabled={!editable} className="h-4 w-4 rounded border-slate-300 disabled:opacity-50" />
                상단 고정
              </label>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!editable || submitting}>{submitting ? "저장 중" : "저장"}</Button>
              <Link href={`/admin/board/${id}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50">취소</Link>
            </div>
          </form>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
