/**
 * 파일 역할: 관리자 / 게시판 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, use, useEffect, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ArrowLeft, FileText, MessageSquare, Paperclip, Pencil, Reply, Trash2 } from "lucide-react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Button 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Button } from "@/components/common/Button";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { MarkdownContent } from "@/components/common/MarkdownContent";
// 코드 설명: @/features/board/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { deleteBoardPost, getBoardPost } from "@/features/board/api";
// 코드 설명: @/features/board/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { BoardPost } from "@/features/board/types";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";
// 코드 설명: ../data 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import {
  canDeletePost,
  canEditPost,
  canManageComments,
  canWriteComments,
  categoryLabels,
  categoryTone,
  formatBoardDate,
  getBoardAttachments,
  getBoardCategory,
  getBoardComments,
  getBoardDisplayName,
  type BoardComment,
} from "../data";

// 코드 설명: createNowLabel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function createNowLabel() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", d…
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

// 코드 설명: CommentItem 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function CommentItem({
  comment,
  level = 0,
  canReply,
  replyValue,
  onReplyChange,
  onReplySubmit,
  onDelete,
}: {
  comment: BoardComment;
  level?: number;
  canReply: boolean;
  replyValue: string;
  onReplyChange: (commentId: string, value: string) => void;
  onReplySubmit: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className={level > 0 ? "ml-6 border-l-2 border-slate-100 pl-4" : ""}>
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-sm text-slate-950">{comment.author}</b>
            <span className="text-xs font-semibold text-slate-400">{comment.createdAt}</span>
            {level > 0 ? <Badge tone="slate">대댓글</Badge> : null}
          </div>
          <button type="button" onClick={() => onDelete(comment.id)} className="inline-flex h-8 items-center gap-1 rounded border border-red-100 px-2 text-xs font-bold text-red-600 transition hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            삭제
          </button>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{comment.content}</p>
        {canReply && level === 0 ? (
          <form
            onSubmit={(event) => {
              // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
              event.preventDefault();
              // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: onReplySubmit(comment.id);
              onReplySubmit(comment.id);
            }}
            className="mt-4 grid gap-2"
          >
            <textarea value={replyValue} onChange={(event) => onReplyChange(comment.id, event.target.value)} rows={2} placeholder="대댓글을 입력하세요." className="resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            <div className="flex justify-end">
              <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-white">
                <Reply className="h-3.5 w-3.5" aria-hidden="true" />
                대댓글 등록
              </button>
            </div>
          </form>
        ) : null}
      </div>
      {comment.replies.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} level={level + 1} canReply={false} replyValue="" onReplyChange={onReplyChange} onReplySubmit={onReplySubmit} onDelete={onDelete} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// 코드 설명: AdminBoardDetailPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function AdminBoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 코드 설명: { id } 비동기 라우트 매개변수 또는 React 리소스를 현재 렌더링 값으로 해제합니다.
  const { id } = use(params);
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [post, setPost] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [post, setPost] = useState<BoardPost | null>(null);
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 코드 설명: [comments, setComments] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [comments, setComments] = useState<BoardComment[]>(() => getBoardComments(id));
  // 코드 설명: [commentText, setCommentText] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [commentText, setCommentText] = useState("");
  // 코드 설명: [replyDrafts, setReplyDrafts] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
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
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: disposed
        if (disposed) return;
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: nextPost.post_status === "DELETED"
        if (nextPost.post_status === "DELETED") {
          // 코드 설명: setPost 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setPost(null);
          // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setErrorMessage("삭제된 게시글입니다.");
        } else {
          // 코드 설명: setPost 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setPost(nextPost);
        }
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !disposed
        if (!disposed) setErrorMessage(error instanceof Error ? error.message : "게시글을 불러오지 못했습니다.");
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

  // 코드 설명: handleDelete 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDelete() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !post
    if (!post) return;
    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm("게시글을 삭제하시겠습니까?");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: setDeleting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDeleting(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await deleteBoardPost(post.id);
      await deleteBoardPost(post.id);
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.push("/admin/board");
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "게시글 삭제에 실패했습니다.");
    } finally {
      // 코드 설명: setDeleting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDeleting(false);
    }
  }

  // 코드 설명: handleAddComment 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleAddComment(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: content 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const content = commentText.trim();
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !content
    if (!content) return;

    // 코드 설명: setComments 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setComments((current) => [...current, { id: `comment-local-${Date.now()}`, author: getBoardDisplayName(authUser), content, createdAt: createNowLabel(), replies: [] }]);
    // 코드 설명: setCommentText 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setCommentText("");
  }

  // 코드 설명: handleReplyChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleReplyChange(commentId: string, value: string) {
    // 코드 설명: setReplyDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setReplyDrafts((current) => ({ ...current, [commentId]: value }));
  }

  // 코드 설명: handleAddReply 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleAddReply(commentId: string) {
    // 코드 설명: content 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const content = replyDrafts[commentId]?.trim();
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !content
    if (!content) return;

    // 코드 설명: setComments 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? { ...comment, replies: [...comment.replies, { id: `reply-local-${Date.now()}`, author: getBoardDisplayName(authUser), content, createdAt: createNowLabel(), replies: [] }] }
          : comment
      )
    );
    // 코드 설명: setReplyDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setReplyDrafts((current) => ({ ...current, [commentId]: "" }));
  }

  // 코드 설명: handleDeleteComment 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleDeleteComment(commentId: string) {
    // 코드 설명: setComments 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setComments((current) => current.filter((comment) => comment.id !== commentId).map((comment) => ({ ...comment, replies: comment.replies.filter((reply) => reply.id !== commentId) })));
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: loading
  if (loading) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <RequireAuth>
        <AppLayout title="관리자 게시판">
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
        <AppLayout title="관리자 게시판">
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

  // 코드 설명: category 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const category = getBoardCategory(post.board_type);
  // 코드 설명: attachments 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const attachments = getBoardAttachments(post.id);
  // 코드 설명: editable 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const editable = canEditPost(post, authUser);
  // 코드 설명: deletable 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const deletable = canDeletePost(post, authUser);
  // 코드 설명: commentManageable 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const commentManageable = canManageComments(authUser);
  // 코드 설명: commentWritable 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const commentWritable = canWriteComments(authUser);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <AppLayout title="관리자 게시판">
        <PageHeader
          title="게시글 상세"
          description="게시글 내용과 첨부파일, 댓글을 확인합니다."
          actions={<>
            <Link href="/admin/board" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white no-underline transition hover:bg-white/15"><ArrowLeft className="h-4 w-4" />게시글 목록</Link>
            {editable ? <Link href={`/admin/board/${post.id}/edit`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white no-underline transition hover:bg-blue-700"><Pencil className="h-4 w-4" />수정</Link> : null}
            {deletable ? <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-300/40 bg-red-500/15 px-4 text-sm font-bold text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"><Trash2 className="h-4 w-4" />삭제</button> : null}
          </>}
        />

        {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={categoryTone[category]}>{categoryLabels[category]}</Badge>
            {post.is_pinned === 1 ? <Badge tone="amber">고정</Badge> : null}
            <span className="text-sm font-semibold text-slate-500">조회 {post.view_count}</span>
            <span className="text-sm font-semibold text-slate-500">댓글 {comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0)}</span>
            <span className="text-sm font-semibold text-slate-500">첨부 {attachments.length}</span>
          </div>
          <h3 className="mt-4 text-2xl font-black text-slate-950">{post.title}</h3>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-100 pb-5 text-sm font-semibold text-slate-500">
            <span>작성자 #{post.author_id}</span>
            <span>작성일 {formatBoardDate(post.created_at)}</span>
            <span>수정일 {formatBoardDate(post.updated_at)}</span>
          </div>
          <article className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-5 sm:px-7">
            <MarkdownContent content={post.content} />
          </article>
        </Card>

        <Card className="mt-5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-slate-500" />
            <h3 className="text-base font-black text-slate-950">첨부파일</h3>
          </div>
          <div className="grid gap-2">
            {attachments.map((file) => (
              <div key={file.id} className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <b className="block truncate text-sm text-slate-900">{file.fileName}</b>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{file.fileType} · {file.fileSize} · {file.uploadedAt}</p>
                  </div>
                </div>
              </div>
            ))}
            {attachments.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">첨부파일이 없습니다.</p> : null}
          </div>
        </Card>

        <Card className="mt-5 p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-black text-slate-950">댓글</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{commentManageable ? "댓글과 대댓글을 작성하고 관리할 수 있습니다." : commentWritable ? "댓글과 대댓글 작성이 가능합니다." : "댓글은 조회만 가능합니다."}</p>
            </div>
            <MessageSquare className="h-5 w-5 text-slate-400" />
          </div>

          {commentWritable ? (
            <form onSubmit={handleAddComment} className="mb-5 grid gap-2">
              <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} rows={3} placeholder="댓글을 입력하세요." className="resize-none rounded-lg border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
              <div className="flex justify-end">
                <button type="submit" className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800">댓글 등록</button>
              </div>
            </form>
          ) : null}

          <div className="grid gap-3">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} canReply={commentWritable} replyValue={replyDrafts[comment.id] ?? ""} onReplyChange={handleReplyChange} onReplySubmit={handleAddReply} onDelete={handleDeleteComment} />
            ))}
            {comments.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">등록된 댓글이 없습니다.</p> : null}
          </div>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
