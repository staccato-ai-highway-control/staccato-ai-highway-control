/**
 * 파일 역할: 관리자 / 게시판 / new 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, useEffect, useMemo, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ArrowLeft, Paperclip, X } from "lucide-react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Button 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Button } from "@/components/common/Button";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/features/board/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { createBoardPost } from "@/features/board/api";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";
// 코드 설명: ../data 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { categoryLabels, getWritableCategories, isSuperAdmin, type BoardCategory } from "../data";

// 코드 설명: allowedExtensions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const allowedExtensions = new Set(["pdf", "png", "jpg", "jpeg"]);

// 코드 설명: getErrorMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getErrorMessage(error: unknown) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: error instanceof Error ? error.message : "게시글 생성에 실패했습니다."
  return error instanceof Error ? error.message : "게시글 생성에 실패했습니다.";
}

// 코드 설명: AdminBoardNewPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function AdminBoardNewPage() {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [category, setCategory] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [category, setCategory] = useState<BoardCategory>("NOTICE");
  // 코드 설명: [title, setTitle] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [title, setTitle] = useState("");
  // 코드 설명: [content, setContent] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [content, setContent] = useState("");
  // 코드 설명: [isPinned, setIsPinned] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isPinned, setIsPinned] = useState(false);
  // 코드 설명: [file, setFile] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [file, setFile] = useState<File | null>(null);
  // 코드 설명: [submitting, setSubmitting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [submitting, setSubmitting] = useState(false);
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
  }, []);

  // 코드 설명: writableCategories 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const writableCategories = useMemo(() => getWritableCategories(authUser), [authUser]);
  // 코드 설명: canPin 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canPin = isSuperAdmin(authUser);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: writableCategories.length > 0 && !writableCategories.includes(category)
    if (writableCategories.length > 0 && !writableCategories.includes(category)) {
      // 코드 설명: setCategory 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setCategory(writableCategories[0]);
    }
  }, [category, writableCategories]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canPin
    if (!canPin) setIsPinned(false);
  }, [canPin]);

  // 코드 설명: handleFileChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleFileChange(fileList: FileList | null) {
    // 코드 설명: nextFile 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const nextFile = fileList?.[0] ?? null;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !nextFile
    if (!nextFile) {
      // 코드 설명: setFile 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setFile(null);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: extension 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const extension = nextFile.name.split(".").pop()?.toLowerCase() ?? "";
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !allowedExtensions.has(extension)
    if (!allowedExtensions.has(extension)) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("첨부파일은 pdf, png, jpg, jpeg 형식만 가능합니다.");
      // 코드 설명: setFile 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setFile(null);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);
    // 코드 설명: setFile 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setFile(nextFile);
  }

  // 코드 설명: handleSubmit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !category
    if (!category) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("카테고리를 선택해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !title.trim() || !content.trim()
    if (!title.trim() || !content.trim()) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("제목과 내용을 입력해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !writableCategories.includes(category)
    if (!writableCategories.includes(category)) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("현재 권한으로 작성할 수 없는 카테고리입니다.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: setSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSubmitting(true);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await createBoardPost({
        board_type: category,
        title: title.trim(),
        content: content.trim(),
        is_pinned: canPin && isPinned ? 1 : 0,
        file,
      });
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.push(`/admin/board/${response.data.post_id}`);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(getErrorMessage(error));
    } finally {
      // 코드 설명: setSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSubmitting(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
