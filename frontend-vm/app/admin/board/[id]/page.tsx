"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, EyeOff, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import type { AuthUser } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import {
  canDeletePost,
  canEditPost,
  canHidePost,
  canManageComments,
  canWriteComments,
  categoryLabels,
  categoryTone,
  getBoardPost,
} from "../data";

export default function AdminBoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const post = getBoardPost(id);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isHidden, setIsHidden] = useState(post?.isHidden ?? false);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  function handleDelete() {
    const confirmed = window.confirm("게시글을 삭제하시겠습니까?");
    if (!confirmed) return;

    router.push("/admin/board");
  }

  function handleToggleHidden() {
    setIsHidden((current) => !current);
  }

  if (!post) {
    return (
      <RequireAuth>
        <AppLayout title="관리자 게시판">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-black text-slate-950">게시글을 찾을 수 없습니다.</h2>
            <Link href="/admin/board" className="mt-5 inline-flex no-underline">
              <Button type="button">목록으로</Button>
            </Link>
          </Card>
        </AppLayout>
      </RequireAuth>
    );
  }

  const editable = canEditPost(post, authUser);
  const deletable = canDeletePost(post, authUser);
  const hideable = canHidePost(authUser);
  const commentManageable = canManageComments(authUser);
  const commentWritable = canWriteComments(authUser);

  return (
    <RequireAuth>
      <AppLayout title="관리자 게시판">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/board"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              게시글 목록
            </Link>
            <h2 className="mt-3 text-2xl font-black text-slate-950">게시글 상세</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {editable ? (
              <Link href={`/admin/board/${post.id}/edit`} className="no-underline">
                <Button type="button" className="gap-2">
                  <Pencil className="h-4 w-4" />
                  수정
                </Button>
              </Link>
            ) : null}
            {commentManageable ? (
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <MessageSquare className="h-4 w-4" />
                댓글 관리
              </button>
            ) : null}
            {hideable ? (
              <button
                type="button"
                onClick={handleToggleHidden}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-200 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-50"
              >
                <EyeOff className="h-4 w-4" />
                {isHidden ? "숨김 해제" : "숨김"}
              </button>
            ) : null}
            {deletable ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            ) : null}
          </div>
        </section>

        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={categoryTone[post.category]}>{categoryLabels[post.category]}</Badge>
            {isHidden ? <Badge tone="amber">숨김</Badge> : null}
            <span className="text-sm font-semibold text-slate-500">조회 {post.views}</span>
            <span className="text-sm font-semibold text-slate-500">댓글 {post.commentsCount}</span>
          </div>
          <h3 className="mt-4 text-2xl font-black text-slate-950">{post.title}</h3>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-100 pb-5 text-sm font-semibold text-slate-500">
            <span>작성자 {post.author}</span>
            <span>작성일 {post.createdAt}</span>
            <span>수정일 {post.updatedAt}</span>
          </div>
          <p className="mt-6 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">
            {post.content}
          </p>
        </Card>
        <Card className="mt-5 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-black text-slate-950">댓글</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {commentManageable
                  ? "댓글 작성과 관리가 가능합니다."
                  : commentWritable
                    ? "댓글 작성이 가능합니다."
                    : "댓글은 조회만 가능합니다."}
              </p>
            </div>
            {commentManageable ? (
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <MessageSquare className="h-4 w-4" />
                댓글 관리
              </button>
            ) : commentWritable ? (
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-black text-white transition hover:bg-teal-800"
              >
                댓글 작성
              </button>
            ) : null}
          </div>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
