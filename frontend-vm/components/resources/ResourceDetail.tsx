"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { AuthUser } from "@/features/auth/types";
import { deleteResource, downloadResourceFile, getResource } from "@/features/resources/api";
import type { ResourceItem } from "@/features/resources/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { isApiError } from "@/lib/apiClient";
import { formatResourceDate, formatResourceFileSize, resourceCategoryLabels, resourceCategoryTone, resourceVisibilityLabels } from "./resourceData";
import { isResourceOwner } from "./resourcePermissions";

export function ResourceDetail({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [resource, setResource] = useState<ResourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  useEffect(() => {
    let disposed = false;

    async function loadResource() {
      setLoading(true);
      setErrorMessage("");
      setErrorStatus(null);

      try {
        const nextResource = await getResource(resourceId);
        if (!disposed) setResource(nextResource);
      } catch (error) {
        if (!disposed) {
          setErrorStatus(isApiError(error) ? error.statusCode : 500);
          setErrorMessage(error instanceof Error ? error.message : "자료를 불러오지 못했습니다.");
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    loadResource();

    return () => {
      disposed = true;
    };
  }, [resourceId]);

  async function handleDownload() {
    if (!resource?.file_name) return;

    try {
      await downloadResourceFile(resource.id, resource.file_name);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "파일 다운로드에 실패했습니다.");
    }
  }

  async function handleDelete() {
    if (!resource || !isResourceOwner(resource, authUser)) return;
    const confirmed = window.confirm("자료를 삭제하시겠습니까?");
    if (!confirmed) return;

    setDeleting(true);
    setErrorMessage("");

    try {
      await deleteResource(resource.id);
      router.push("/resources");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "자료 삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  const canManage = resource ? isResourceOwner(resource, authUser) : false;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="mb-5">
          <Link href="/resources" className="inline-flex items-center gap-2 text-sm font-black text-slate-600 no-underline hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            자료실로 돌아가기
          </Link>
        </div>

        {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><b>{errorStatus ?? 500}</b> · {errorMessage}</div> : null}
        {loading ? <Card className="p-10 text-center text-sm font-semibold text-slate-500">자료를 불러오는 중입니다.</Card> : null}
        {!loading && !resource ? <Card className="p-10 text-center text-sm font-semibold text-slate-500">요청한 자료를 찾을 수 없습니다.</Card> : null}

        {resource ? (
          <article className="grid gap-5">
            <Card className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge tone={resourceCategoryTone[resource.category]}>{resource.category_label || resourceCategoryLabels[resource.category]}</Badge>
                    <Badge tone="slate">{resourceVisibilityLabels[resource.visibility]}</Badge>
                  </div>
                  <h1 className="text-2xl font-black text-slate-950">{resource.title}</h1>
                  <p className="mt-3 text-sm font-semibold text-slate-500">{resource.author_name} · {formatResourceDate(resource.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {resource.file_name ? (
                    <button type="button" onClick={handleDownload} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-200 px-3 text-sm font-bold text-sky-700 transition hover:bg-sky-50">
                      <Download className="h-4 w-4" aria-hidden="true" />
                      다운로드
                    </button>
                  ) : null}
                  {canManage ? (
                    <>
                      <Link href={`/resources/${resource.id}/edit`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        수정
                      </Link>
                      <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        삭제
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 text-base font-black text-slate-950">설명</h2>
              <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">{resource.description || "설명이 없습니다."}</p>
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 text-base font-black text-slate-950">첨부파일</h2>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                {resource.file_name ? (
                  <>
                    <p className="truncate text-sm font-black text-slate-950">{resource.file_name}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{resource.file_type || "파일"} · {formatResourceFileSize(resource.file_size ?? 0)}</p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-slate-500">첨부된 파일이 없습니다.</p>
                )}
              </div>
            </Card>
          </article>
        ) : null}
      </section>
    </main>
  );
}
