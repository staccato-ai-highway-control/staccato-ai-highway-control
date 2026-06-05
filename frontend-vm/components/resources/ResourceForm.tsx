"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { createResource } from "@/features/resources/api";
import type { ResourceCategory, ResourceVisibility } from "@/features/resources/types";
import { allowedResourceExtensions, resourceCategoryLabels, resourceCategoryOptions, resourceVisibilityLabels } from "./resourceData";

const visibilityOptions: ResourceVisibility[] = ["ADMIN_ALL", "SUPER_ADMIN_ONLY", "OWNER_ONLY"];

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function ResourceForm() {
  const router = useRouter();
  const [category, setCategory] = useState<ResourceCategory>("PRESENTATION");
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ResourceVisibility>("ADMIN_ALL");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const accept = useMemo(() => allowedResourceExtensions.map((extension) => `.${extension}`).join(","), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!file) {
      setErrorMessage("첨부파일을 선택해 주세요.");
      return;
    }

    const extension = getExtension(file.name);
    if (!allowedResourceExtensions.includes(extension)) {
      setErrorMessage("허용되지 않은 파일 형식입니다.");
      return;
    }

    setSubmitting(true);

    try {
      const resource = await createResource({
        category,
        title,
        author_name: authorName.trim() || undefined,
        description: description.trim() || undefined,
        visibility,
        file,
      });
      router.push(`/resources/${resource.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "자료 등록에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <RequireSuperAdmin>
      <AppLayout title="자료 등록">
        <div className="mb-5">
          <Link href="/resources" className="inline-flex items-center gap-2 text-sm font-black text-slate-600 no-underline hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            자료실로 돌아가기
          </Link>
        </div>

        <section className="mb-6">
          <h2 className="text-2xl font-black text-slate-950">자료 등록</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">프로젝트 문서, 발표자료, 회의록과 개인정보 포함 자료를 분류해 등록합니다.</p>
        </section>

        {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        <Card className="p-5">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-black text-slate-500">카테고리</span>
                <select value={category} onChange={(event) => setCategory(event.target.value as ResourceCategory)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
                  {resourceCategoryOptions.map((option) => <option key={option} value={option}>{resourceCategoryLabels[option]}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black text-slate-500">공개 범위</span>
                <select value={visibility} onChange={(event) => setVisibility(event.target.value as ResourceVisibility)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
                  {visibilityOptions.map((option) => <option key={option} value={option}>{resourceVisibilityLabels[option]}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-black text-slate-500">제목</span>
                <input required value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black text-slate-500">작성자</span>
                <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} placeholder="미입력 시 서버 기본값 사용" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">설명</span>
              <textarea rows={6} value={description} onChange={(event) => setDescription(event.target.value)} className="resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">첨부파일 업로드</span>
              <span className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
                <Upload className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <span className="truncate">{file?.name ?? "업로드할 파일을 선택하세요."}</span>
                <input type="file" accept={accept} className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </span>
              <span className="text-xs font-semibold text-slate-400">허용 확장자: {allowedResourceExtensions.join(", ")}</span>
            </label>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Link href="/resources" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 no-underline transition hover:bg-slate-50">취소</Link>
              <Button type="submit" disabled={submitting}>{submitting ? "등록 중" : "등록"}</Button>
            </div>
          </form>
        </Card>
      </AppLayout>
    </RequireSuperAdmin>
  );
}
