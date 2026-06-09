"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Paperclip, X } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { createBoardPost } from "@/features/board/api";
import type { AuthUser } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { categoryLabels, getWritableCategories, isSuperAdmin, type BoardCategory } from "../data";

const allowedExtensions = new Set(["pdf", "png", "jpg", "jpeg"]);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "게시글 생성에 실패했습니다.";
}

export default function AdminBoardNewPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [category, setCategory] = useState<BoardCategory>("NOTICE");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const writableCategories = useMemo(() => getWritableCategories(authUser), [authUser]);
  const canPin = isSuperAdmin(authUser);

  useEffect(() => {
    if (writableCategories.length > 0 && !writableCategories.includes(category)) {
      setCategory(writableCategories[0]);
    }
  }, [category, writableCategories]);

  useEffect(() => {
    if (!canPin) setIsPinned(false);
  }, [canPin]);

  function handleFileChange(fileList: FileList | null) {
    const nextFile = fileList?.[0] ?? null;
    if (!nextFile) {
      setFile(null);
      return;
    }

    const extension = nextFile.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExtensions.has(extension)) {
      setErrorMessage("첨부파일은 pdf, png, jpg, jpeg 형식만 가능합니다.");
      setFile(null);
      return;
    }

    setErrorMessage(null);
    setFile(nextFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!category) {
      setErrorMessage("카테고리를 선택해주세요.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      setErrorMessage("제목과 내용을 입력해주세요.");
      return;
    }

    if (!writableCategories.includes(category)) {
      setErrorMessage("현재 권한으로 작성할 수 없는 카테고리입니다.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await createBoardPost({
        board_type: category,
        title: title.trim(),
        content: content.trim(),
        is_pinned: canPin && isPinned ? 1 : 0,
        file,
      });
      router.push(`/admin/board/${response.data.post_id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <AppLayout title="게시글 작성">
        <section className="mb-6">
          <Link href="/admin/board" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            게시글 목록
          </Link>
          <h2 className="mt-3 text-2xl font-black text-slate-950">게시글 작성</h2>
        </section>

        <Card className="p-6">
          {writableCategories.length === 0 ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">현재 권한은 게시글 조회만 가능합니다.</div> : null}
          {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}
          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">카테고리</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as BoardCategory)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
                {writableCategories.map((value) => (
                  <option key={value} value={value}>{categoryLabels[value]}</option>
                ))}
                {writableCategories.length === 0 ? <option value="NOTICE">작성 권한 없음</option> : null}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">제목</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">내용</span>
              <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={12} className="resize-none rounded-lg border border-slate-200 p-3 text-sm font-semibold leading-7 text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>

            {canPin ? (
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                상단 고정
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">첨부파일</span>
              <span className="grid gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                  pdf, png, jpg, jpeg 파일 1개를 첨부할 수 있습니다.
                </span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => handleFileChange(event.target.files)} className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700" />
                {file ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                    <span className="truncate">{file.name} · {Math.ceil(file.size / 1024)} KB</span>
                    <button type="button" onClick={() => setFile(null)} className="grid h-7 w-7 place-items-center rounded border border-red-100 text-red-600 hover:bg-red-50" aria-label="첨부파일 제거">
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={writableCategories.length === 0 || submitting}>{submitting ? "등록 중" : "등록"}</Button>
              <Link href="/admin/board" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50">취소</Link>
            </div>
          </form>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
