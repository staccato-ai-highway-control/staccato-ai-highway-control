"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Paperclip, X } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import type { AuthUser } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { categoryLabels, getWritableCategories, type BoardCategory } from "../data";

export default function AdminBoardNewPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [category, setCategory] = useState<BoardCategory>("NOTICE");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const writableCategories = useMemo(() => getWritableCategories(authUser), [authUser]);

  useEffect(() => {
    if (writableCategories.length > 0 && !writableCategories.includes(category)) {
      setCategory(writableCategories[0]);
    }
  }, [category, writableCategories]);

  function handleFileChange(fileList: FileList | null) {
    setFiles(Array.from(fileList ?? []));
  }

  function handleRemoveFile(fileName: string) {
    setFiles((current) => current.filter((file) => file.name !== fileName));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    if (!writableCategories.includes(category)) {
      alert("현재 권한으로 작성할 수 없는 카테고리입니다.");
      return;
    }

    alert("게시글이 작성되었습니다.");
    router.push("/admin/board");
  }

  return (
    <RequireAuth>
      <AppLayout title="게시글 작성">
        <section className="mb-6">
          <Link
            href="/admin/board"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            게시글 목록
          </Link>
          <h2 className="mt-3 text-2xl font-black text-slate-950">게시글 작성</h2>
        </section>

        <Card className="p-6">
          {writableCategories.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              현재 권한은 게시글 조회만 가능합니다.
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">카테고리</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as BoardCategory)}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {writableCategories.map((value) => (
                  <option key={value} value={value}>{categoryLabels[value]}</option>
                ))}
                {writableCategories.length === 0 ? (
                  <option value="NOTICE">작성 권한 없음</option>
                ) : null}
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

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">첨부파일</span>
              <span className="grid gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                  파일을 선택해 게시글에 첨부합니다.
                </span>
                <input
                  type="file"
                  multiple
                  onChange={(event) => handleFileChange(event.target.files)}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700"
                />
                {files.length > 0 ? (
                  <div className="grid gap-2">
                    {files.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                        <span className="truncate">{file.name} · {Math.ceil(file.size / 1024)} KB</span>
                        <button type="button" onClick={() => handleRemoveFile(file.name)} className="grid h-7 w-7 place-items-center rounded border border-red-100 text-red-600 hover:bg-red-50" aria-label="첨부파일 제거">
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={writableCategories.length === 0}>등록</Button>
              <Link
                href="/admin/board"
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
