"use client";

import Link from "next/link";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { categoryLabels, categoryTone, getBoardPost } from "../data";

export default function AdminBoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const post = getBoardPost(id);

  function handleDelete() {
    const confirmed = window.confirm("게시글을 삭제하시겠습니까?");
    if (!confirmed) return;

    router.push("/admin/board");
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
            <Link href={`/admin/board/${post.id}/edit`} className="no-underline">
              <Button type="button" className="gap-2">
                <Pencil className="h-4 w-4" />
                수정
              </Button>
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          </div>
        </section>

        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={categoryTone[post.category]}>{categoryLabels[post.category]}</Badge>
            <span className="text-sm font-semibold text-slate-500">조회 {post.views}</span>
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
      </AppLayout>
    </RequireAuth>
  );
}
