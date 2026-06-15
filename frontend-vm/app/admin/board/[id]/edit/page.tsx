/**
 * 파일 역할: 관리자 / 게시판 / edit 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 *
 * 데이터 흐름:
 * 1. URL의 `[id]` 값으로 기존 게시글을 백엔드에서 조회합니다.
 * 2. 응답을 React 상태에 복사해 입력 필드의 초기값으로 사용합니다.
 * 3. 사용자 입력은 로컬 상태만 변경하고, 제출 시 JSON 요청 본문으로 조립합니다.
 * 4. API 모듈이 PUT 요청을 Flask 게시판 API로 보내고 성공하면 상세 화면으로 이동합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, use, useEffect, useMemo, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ArrowLeft } from "lucide-react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Button 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Button } from "@/components/common/Button";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
// 코드 설명: @/features/board/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getBoardPost, updateBoardPost } from "@/features/board/api";
// 코드 설명: @/features/board/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { BoardPost } from "@/features/board/types";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";
// 코드 설명: ../../data 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { canEditPost, categoryLabels, getBoardCategory, getWritableCategories, isSuperAdmin, type BoardCategory } from "../../data";

// 코드 설명: getErrorMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getErrorMessage(error: unknown) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: error instanceof Error ? error.message : "게시글 수정에 실패했습니다."
  return error instanceof Error ? error.message : "게시글 수정에 실패했습니다.";
}

// 코드 설명: AdminBoardEditPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function AdminBoardEditPage({ params }: { params: Promise<{ id: string }> }) {
  // 동적 라우트의 `[id]`는 조회와 수정 API에서 백엔드 게시글 식별자로 사용됩니다.
  const { id } = use(params);
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();

  // `post`는 서버에서 받은 원본이며 권한 판정과 수정 전 값 보존에 사용합니다.
  // title/content 등의 필드 상태는 사용자가 입력할 때 프론트에서만 먼저 변경됩니다.
  const [post, setPost] = useState<BoardPost | null>(null);
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
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [submitting, setSubmitting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [submitting, setSubmitting] = useState(false);
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 로그인 시 localStorage에 저장한 사용자 스냅샷을 화면 권한 표시에 사용합니다.
  // 실제 수정 권한은 조작 가능한 클라이언트 값이 아니라 백엔드가 다시 검증해야 합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
  }, []);

  // 화면 -> features/board/api.ts -> /backend-api -> Next.js rewrite -> Flask 순서로 조회합니다.
  useEffect(() => {
    // 코드 설명: disposed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let disposed = false;

    // 코드 설명: loadPost 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function loadPost() {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(true);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(null);

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: nextPost 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const nextPost = await getBoardPost(id);
        // 화면이 해제됐다면 늦게 도착한 응답으로 이전 화면 상태를 갱신하지 않습니다.
        if (disposed) return;
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: nextPost.post_status === "DELETED"
        if (nextPost.post_status === "DELETED") {
          // 코드 설명: setPost 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setPost(null);
          // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setErrorMessage("삭제된 게시글입니다.");
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
          return;
        }

        // 백엔드 snake_case 응답을 입력 상태로 옮기고 0/1은 체크박스용 boolean으로 변환합니다.
        setPost(nextPost);
        // 코드 설명: setCategory 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setCategory(getBoardCategory(nextPost.board_type));
        // 코드 설명: setTitle 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setTitle(nextPost.title);
        // 코드 설명: setContent 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setContent(nextPost.content);
        // 코드 설명: setIsPinned 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setIsPinned(nextPost.is_pinned === 1);
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) setErrorMessage(getErrorMessage(error));
      } finally {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) setLoading(false);
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadPost();
    loadPost();
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { disposed = true; }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: disposed = true;
      disposed = true;
    };
  }, [id]);

  // 프론트 권한 계산은 UX용 선행 차단이며 실제 PUT 요청의 권한 검사를 대체하지 않습니다.
  const editable = post ? canEditPost(post, authUser) : false;
  // 코드 설명: writableCategories 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const writableCategories = useMemo(() => getWritableCategories(authUser), [authUser]);
  // 코드 설명: editableCategories 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const editableCategories = post ? (writableCategories.includes(getBoardCategory(post.board_type)) ? writableCategories : [getBoardCategory(post.board_type)]) : writableCategories;
  // 코드 설명: canPin 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canPin = isSuperAdmin(authUser);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !canPin && post
    if (!canPin && post) setIsPinned(post.is_pinned === 1);
  }, [canPin, post]);

  // 기본 폼 전송을 막고 React 상태를 API 요청 본문으로 변환합니다.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !post || !editable
    if (!post || !editable) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("현재 권한으로 수정할 수 없는 게시글입니다.");
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

    // 코드 설명: setSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSubmitting(true);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 아래 객체는 JSON으로 직렬화되어 PUT /board/posts/:id 요청 본문이 됩니다.
      await updateBoardPost(id, {
        title: title.trim(),
        content: content.trim(),
        board_type: category,
        is_pinned: canPin ? (isPinned ? 1 : 0) : post.is_pinned,
      });
      // 상세 화면으로 이동하면 해당 화면이 수정된 게시글을 백엔드에서 다시 조회합니다.
      router.push(`/admin/board/${id}`);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(getErrorMessage(error));
    } finally {
      // 코드 설명: setSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSubmitting(false);
    }
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: loading
  if (loading) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <RequireAuth>
        <AppLayout title="게시글 수정">
          <Card className="p-8 text-center text-sm font-semibold text-slate-500">게시글을 불러오는 중입니다.</Card>
        </AppLayout>
      </RequireAuth>
    );
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !post
  if (!post) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <RequireAuth>
        <AppLayout title="게시글 수정">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-black text-slate-950">게시글을 찾을 수 없습니다.</h2>
            {errorMessage ? <p className="mt-3 text-sm font-semibold text-red-600">{errorMessage}</p> : null}
            <Link href="/admin/board" className="mt-5 inline-flex no-underline">
              <Button type="button">목록으로</Button>
            </Link>
          </Card>
        </AppLayout>
      </RequireAuth>
    );
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <AppLayout title="게시글 수정">
        <PageHeader title="게시글 수정" description="게시글의 분류와 내용을 수정합니다." actions={<Link href={`/admin/board/${id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white no-underline transition hover:bg-white/15"><ArrowLeft className="h-4 w-4" />게시글 상세</Link>} />

        <Card className="p-6">
          {!editable ? <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">현재 권한으로 수정할 수 없는 게시글입니다.</div> : null}
          {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}
          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">카테고리</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as BoardCategory)} disabled={!editable} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400">
                {editableCategories.map((value) => (
                  <option key={value} value={value}>{categoryLabels[value]}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">제목</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={!editable} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">내용</span>
              <textarea value={content} onChange={(event) => setContent(event.target.value)} disabled={!editable} rows={12} className="resize-none rounded-lg border border-slate-200 p-3 text-sm font-semibold leading-7 text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400" />
            </label>

            {canPin ? (
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} disabled={!editable} className="h-4 w-4 rounded border-slate-300 disabled:opacity-50" />
                상단 고정
              </label>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!editable || submitting}>{submitting ? "저장 중" : "저장"}</Button>
              <Link href={`/admin/board/${id}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50">취소</Link>
            </div>
          </form>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
