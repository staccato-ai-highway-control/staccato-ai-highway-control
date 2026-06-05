"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import type { AuthUser } from "@/features/auth/types";
import { createResource, getResource, updateResource } from "@/features/resources/api";
import type { ResourceCategory, ResourceItem, ResourceVisibility } from "@/features/resources/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { allowedResourceExtensions, resourceCategoryLabels, resourceCategoryOptions, resourceVisibilityLabels } from "./resourceData";
import { isResourceAdmin, isResourceOwner } from "./resourcePermissions";

const visibilityOptions: ResourceVisibility[] = ["ADMIN_ALL", "SUPER_ADMIN_ONLY", "OWNER_ONLY"];

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function ResourceForm({ resourceId }: { resourceId?: string }) {
  const router = useRouter();
  const isEditMode = Boolean(resourceId);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [resource, setResource] = useState<ResourceItem | null>(null);
  const [category, setCategory] = useState<ResourceCategory>("PRESENTATION");
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ResourceVisibility>("ADMIN_ALL");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const accept = useMemo(() => allowedResourceExtensions.map((extension) => `.${extension}`).join(","), []);

  useEffect(() => {
    const user = getStoredAuthUser();
    setAuthUser(user);

    if (!isResourceAdmin(user)) {
      router.replace("/forbidden");
    }
  }, [router]);

  useEffect(() => {
    if (!resourceId || !authUser) return;
    const targetResourceId = resourceId;
    let disposed = false;

    async function loadResource() {
      setLoading(true);
      setErrorMessage("");

      try {
        const nextResource = await getResource(targetResourceId);
        if (disposed) return;

        if (!isResourceOwner(nextResource, authUser)) {
          router.replace("/forbidden");
          return;
        }

        setResource(nextResource);
        setCategory(nextResource.category);
        setTitle(nextResource.title);
        setAuthorName(nextResource.author_name);
        setDescription(nextResource.description ?? "");
        setVisibility(nextResource.visibility);
      } catch (error) {
        if (!disposed) setErrorMessage(error instanceof Error ? error.message : "자료를 불러오지 못했습니다.");
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    loadResource();

    return () => {
      disposed = true;
    };
  }, [authUser, resourceId, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!isResourceAdmin(authUser)) {
      router.replace("/forbidden");
      return;
    }

    if (!isEditMode && !file) {
      setErrorMessage("첨부파일을 선택해 주세요.");
      return;
    }

    if (file && !allowedResourceExtensions.includes(getExtension(file.name))) {
      setErrorMessage("허용되지 않은 파일 형식입니다.");
      return;
    }

    if (isEditMode && (!resource || !isResourceOwner(resource, authUser))) {
      router.replace("/forbidden");
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode && resource) {
        const updatedResource = await updateResource(resource.id, {
          category,
          title,
          description: description.trim(),
          visibility,
          file,
        });
        router.push(`/resources/${updatedResource.id}`);
        return;
      }

      const createdResource = await createResource({
        category,
        title,
        author_name: authorName.trim() || undefined,
        description: description.trim() || undefined,
        visibility,
        file: file as File,
      });
      router.push(`/resources/${createdResource.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `자료 ${isEditMode ? "수정" : "등록"}에 실패했습니다.`);
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
        <section className="mx-auto max-w-4xl">
          <div className="mb-5">
            <Link href={resourceId ? `/resources/${resourceId}` : "/resources"} className="inline-flex items-center gap-2 text-sm font-black text-slate-600 no-underline hover:text-slate-950">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {resourceId ? "자료 상세로 돌아가기" : "자료실로 돌아가기"}
            </Link>
          </div>

          <header className="mb-6">
            <h1 className="text-2xl font-black text-slate-950">자료 {isEditMode ? "수정" : "등록"}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">프로젝트 문서, 발표자료, 회의록과 개인정보 포함 자료를 분류해 관리합니다.</p>
          </header>

          {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}
          {loading ? <Card className="p-10 text-center text-sm font-semibold text-slate-500">자료를 불러오는 중입니다.</Card> : null}

          {!loading ? (
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
                    <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} disabled={isEditMode} placeholder="미입력 시 서버 기본값 사용" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100" />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-xs font-black text-slate-500">설명</span>
                  <textarea rows={6} value={description} onChange={(event) => setDescription(event.target.value)} className="resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-black text-slate-500">첨부파일 {isEditMode ? "교체" : "업로드"}</span>
                  <span className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
                    <Upload className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span className="truncate">{file?.name ?? (isEditMode ? `${resource?.file_name ?? "기존 파일"} 유지` : "업로드할 파일을 선택하세요.")}</span>
                    <input type="file" accept={accept} className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                  </span>
                  <span className="text-xs font-semibold text-slate-400">허용 확장자: {allowedResourceExtensions.join(", ")}</span>
                </label>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Link href={resourceId ? `/resources/${resourceId}` : "/resources"} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 no-underline transition hover:bg-slate-50">취소</Link>
                  <Button type="submit" disabled={submitting}>{submitting ? `${isEditMode ? "수정" : "등록"} 중` : isEditMode ? "수정" : "등록"}</Button>
                </div>
              </form>
            </Card>
          ) : null}
        </section>
      </main>
    </RequireAuth>
  );
}
