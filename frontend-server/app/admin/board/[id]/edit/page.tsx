"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { categoryLabels, getBoardPost, type BoardCategory } from "../../data";

export default function AdminBoardEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const post = getBoardPost(id);
  const [category, setCategory] = useState<BoardCategory>(post?.category ?? "NOTICE");
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    alert("게시글이 수정되었습니다.");
    router.push(`/admin/board/${id}`);
  }

  if (!post) {
    return (
      <RequireAuth>
        <AppLayout title="게시글 수정">
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
      <AppLayout title="게시글 수정">
        <section className="mb-6">
          <Link
            href={`/admin/board/${id}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            게시글 상세
          </Link>
          <h2 className="mt-3 text-2xl font-black text-slate-950">게시글 수정</h2>
        </section>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">카테고리</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as BoardCategory)}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">제목</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">내용</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={12}
                className="resize-none rounded-lg border border-slate-200 p-3 text-sm font-semibold leading-7 text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">저장</Button>
              <Link
                href={`/admin/board/${id}`}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50"
              >
                취소
              </Link>
            </div>
          </form>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
