/**
 * 파일 역할: 자료실 영역에서 사용하는 ResourceForm UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, useEffect, useMemo, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ArrowLeft, Upload } from "lucide-react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/common/Button 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Button } from "@/components/common/Button";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/features/resources/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { createResource, getResource, updateResource } from "@/features/resources/api";
// 코드 설명: @/features/resources/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ResourceCategory, ResourceItem, ResourceVisibility } from "@/features/resources/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";
// 코드 설명: ./resourceData 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { allowedResourceExtensions, resourceCategoryLabels, resourceCategoryOptions, resourceVisibilityLabels } from "./resourceData";
// 코드 설명: ./resourcePermissions 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { isResourceAdmin, isResourceOwner } from "./resourcePermissions";

// 코드 설명: visibilityOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const visibilityOptions: ResourceVisibility[] = ["ADMIN_ALL", "SUPER_ADMIN_ONLY", "OWNER_ONLY"];

// 코드 설명: getExtension 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getExtension(fileName: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: fileName.split(".").pop()?.toLowerCase() ?? ""
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

// 코드 설명: ResourceForm 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ResourceForm({ resourceId }: { resourceId?: string }) {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: isEditMode 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isEditMode = Boolean(resourceId);
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [resource, setResource] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [resource, setResource] = useState<ResourceItem | null>(null);
  // 코드 설명: [category, setCategory] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [category, setCategory] = useState<ResourceCategory>("PRESENTATION");
  // 코드 설명: [title, setTitle] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [title, setTitle] = useState("");
  // 코드 설명: [authorName, setAuthorName] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [authorName, setAuthorName] = useState("");
  // 코드 설명: [description, setDescription] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [description, setDescription] = useState("");
  // 코드 설명: [visibility, setVisibility] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [visibility, setVisibility] = useState<ResourceVisibility>("ADMIN_ALL");
  // 코드 설명: [file, setFile] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [file, setFile] = useState<File | null>(null);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(isEditMode);
  // 코드 설명: [submitting, setSubmitting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [submitting, setSubmitting] = useState(false);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: accept 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const accept = useMemo(() => allowedResourceExtensions.map((extension) => `.${extension}`).join(","), []);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: user 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const user = getStoredAuthUser();
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(user);

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isResourceAdmin(user)
    if (!isResourceAdmin(user)) {
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.replace("/forbidden");
    }
  }, [router]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !resourceId || !authUser
    if (!resourceId || !authUser) return;
    // 코드 설명: targetResourceId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const targetResourceId = resourceId;
    // 코드 설명: disposed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let disposed = false;

    // 코드 설명: loadResource 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function loadResource() {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(true);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("");

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: nextResource 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const nextResource = await getResource(targetResourceId);
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: disposed
        if (disposed) return;

        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isResourceOwner(nextResource, authUser)
        if (!isResourceOwner(nextResource, authUser)) {
          // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
          router.replace("/forbidden");
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
          return;
        }

        // 코드 설명: setResource 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setResource(nextResource);
        // 코드 설명: setCategory 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setCategory(nextResource.category);
        // 코드 설명: setTitle 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setTitle(nextResource.title);
        // 코드 설명: setAuthorName 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setAuthorName(nextResource.author_name);
        // 코드 설명: setDescription 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setDescription(nextResource.description ?? "");
        // 코드 설명: setVisibility 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setVisibility(nextResource.visibility);
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) setErrorMessage(error instanceof Error ? error.message : "자료를 불러오지 못했습니다.");
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
  }, [authUser, resourceId, router]);

  // 코드 설명: handleSubmit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isResourceAdmin(authUser)
    if (!isResourceAdmin(authUser)) {
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.replace("/forbidden");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: file && !allowedResourceExtensions.includes(getExtension(file.name))
    if (file && !allowedResourceExtensions.includes(getExtension(file.name))) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("허용되지 않은 파일 형식입니다.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isEditMode && (!resource || !isResourceOwner(resource, authUser))
    if (isEditMode && (!resource || !isResourceOwner(resource, authUser))) {
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.replace("/forbidden");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: setSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSubmitting(true);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isEditMode && resource
      if (isEditMode && resource) {
        // 코드 설명: updatedResource 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const updatedResource = await updateResource(resource.id, {
          category,
          title,
          description: description.trim(),
          visibility,
          file,
        });
        // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
        router.push(`/resources/${updatedResource.id}`);
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: createdResource 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const createdResource = await createResource({
        category,
        title,
        author_name: authorName.trim() || undefined,
        description: description.trim() || undefined,
        visibility,
        file,
      });
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.push(`/resources/${createdResource.id}`);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : `자료 ${isEditMode ? "수정" : "등록"}에 실패했습니다.`);
      // 코드 설명: setSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSubmitting(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
                  <span className="text-xs font-black text-slate-500">첨부파일 {isEditMode ? "교체" : "업로드"} <span className="font-semibold text-slate-400">(선택)</span></span>
                  <span className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
                    <Upload className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span className="truncate">{file?.name ?? (isEditMode ? `${resource?.file_name ?? "기존 파일"} 유지` : "첨부할 파일이 있다면 선택하세요.")}</span>
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
