/**
 * 파일 역할: 자료실 영역에서 사용하는 ResourceDetail UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ArrowLeft, Download, Pencil, Trash2 } from "lucide-react";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/features/resources/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { deleteResource, downloadResourceFile, getResource } from "@/features/resources/api";
// 코드 설명: @/features/resources/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ResourceItem } from "@/features/resources/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";
// 코드 설명: @/lib/apiClient 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { isApiError } from "@/lib/apiClient";
// 코드 설명: ./resourceData 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { formatResourceDate, formatResourceFileSize, resourceCategoryLabels, resourceCategoryTone, resourceVisibilityLabels } from "./resourceData";
// 코드 설명: ./resourcePermissions 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { isResourceOwner } from "./resourcePermissions";

// 코드 설명: ResourceDetail 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ResourceDetail({ resourceId }: { resourceId: string }) {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [resource, setResource] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [resource, setResource] = useState<ResourceItem | null>(null);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: [errorStatus, setErrorStatus] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  // 코드 설명: [deleting, setDeleting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [deleting, setDeleting] = useState(false);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
  }, []);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: disposed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let disposed = false;

    // 코드 설명: loadResource 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function loadResource() {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(true);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("");
      // 코드 설명: setErrorStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorStatus(null);

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: nextResource 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const nextResource = await getResource(resourceId);
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) setResource(nextResource);
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) {
          // 코드 설명: setErrorStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setErrorStatus(isApiError(error) ? error.statusCode : 500);
          // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setErrorMessage(error instanceof Error ? error.message : "자료를 불러오지 못했습니다.");
        }
      } finally {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) setLoading(false);
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadResource();
    loadResource();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { disposed = true; }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: disposed = true;
      disposed = true;
    };
  }, [resourceId]);

  // 코드 설명: handleDownload 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDownload() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !resource?.file_name
    if (!resource?.file_name) return;

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await downloadResourceFile(resource.id, resource.file_name);
      await downloadResourceFile(resource.id, resource.file_name);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "파일 다운로드에 실패했습니다.");
    }
  }

  // 코드 설명: handleDelete 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDelete() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !resource || !isResourceOwner(resource, authUser)
    if (!resource || !isResourceOwner(resource, authUser)) return;
    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm("자료를 삭제하시겠습니까?");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: setDeleting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDeleting(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await deleteResource(resource.id);
      await deleteResource(resource.id);
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.push("/resources");
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "자료 삭제에 실패했습니다.");
      // 코드 설명: setDeleting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDeleting(false);
    }
  }

  // 코드 설명: canManage 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canManage = resource ? isResourceOwner(resource, authUser) : false;

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
