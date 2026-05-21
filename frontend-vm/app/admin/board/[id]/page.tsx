"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, EyeOff, FileText, MessageSquare, Paperclip, Pencil, Reply, Trash2 } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import type { AuthUser } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import {
  canDeletePost,
  canEditPost,
  canHidePost,
  canManageComments,
  canWriteComments,
  categoryLabels,
  categoryTone,
  getBoardAttachments,
  getBoardComments,
  getBoardDisplayName,
  getBoardPost,
  type BoardComment,
} from "../data";

function createNowLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

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
              event.preventDefault();
              onReplySubmit(comment.id);
            }}
            className="mt-4 grid gap-2"
          >
            <textarea
              value={replyValue}
              onChange={(event) => onReplyChange(comment.id, event.target.value)}
              rows={2}
              placeholder="대댓글을 입력하세요."
              className="resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
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
            <CommentItem
              key={reply.id}
              comment={reply}
              level={level + 1}
              canReply={false}
              replyValue=""
              onReplyChange={onReplyChange}
              onReplySubmit={onReplySubmit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminBoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const post = getBoardPost(id);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isHidden, setIsHidden] = useState(post?.isHidden ?? false);
  const [comments, setComments] = useState<BoardComment[]>(() => getBoardComments(id));
  const [commentText, setCommentText] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  function handleDelete() {
    const confirmed = window.confirm("게시글을 삭제하시겠습니까?");
    if (!confirmed) return;

    router.push("/admin/board");
  }

  function handleToggleHidden() {
    setIsHidden((current) => !current);
  }

  function handleDownload(fileName: string) {
    window.alert(`${fileName} 다운로드는 파일 API 연결 후 처리됩니다.`);
  }

  function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = commentText.trim();
    if (!content) return;

    setComments((current) => [
      ...current,
      {
        id: `comment-local-${Date.now()}`,
        author: getBoardDisplayName(authUser),
        content,
        createdAt: createNowLabel(),
        replies: [],
      },
    ]);
    setCommentText("");
  }

  function handleReplyChange(commentId: string, value: string) {
    setReplyDrafts((current) => ({ ...current, [commentId]: value }));
  }

  function handleAddReply(commentId: string) {
    const content = replyDrafts[commentId]?.trim();
    if (!content) return;

    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: [
                ...comment.replies,
                {
                  id: `reply-local-${Date.now()}`,
                  author: getBoardDisplayName(authUser),
                  content,
                  createdAt: createNowLabel(),
                  replies: [],
                },
              ],
            }
          : comment
      )
    );
    setReplyDrafts((current) => ({ ...current, [commentId]: "" }));
  }

  function handleDeleteComment(commentId: string) {
    setComments((current) =>
      current
        .filter((comment) => comment.id !== commentId)
        .map((comment) => ({
          ...comment,
          replies: comment.replies.filter((reply) => reply.id !== commentId),
        }))
    );
  }

  if (!post) {
    return (
      <RequireAuth>
        <AppLayout title="관리자 게시판">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-black text-slate-950">게시글을 찾을 수 없습니다.</h2>
            <Link href="/admin/board" className="mt-5 inline-flex no-underline">
              <Button type="button">목록으로</Button>
            </Link>
          </Card>
        </AppLayout>
      </RequireAuth>
    );
  }

  const attachments = getBoardAttachments(post.id);
  const editable = canEditPost(post, authUser);
  const deletable = canDeletePost(post, authUser);
  const hideable = canHidePost(authUser);
  const commentManageable = canManageComments(authUser);
  const commentWritable = canWriteComments(authUser);

  return (
    <RequireAuth>
      <AppLayout title="관리자 게시판">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin/board" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition hover:text-slate-950">
              <ArrowLeft className="h-4 w-4" />
              게시글 목록
            </Link>
            <h2 className="mt-3 text-2xl font-black text-slate-950">게시글 상세</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {editable ? (
              <Link href={`/admin/board/${post.id}/edit`} className="no-underline">
                <Button type="button" className="gap-2"><Pencil className="h-4 w-4" />수정</Button>
              </Link>
            ) : null}
            {hideable ? (
              <button type="button" onClick={handleToggleHidden} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-200 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-50">
                <EyeOff className="h-4 w-4" />{isHidden ? "숨김 해제" : "숨김"}
              </button>
            ) : null}
            {deletable ? (
              <button type="button" onClick={handleDelete} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50">
                <Trash2 className="h-4 w-4" />삭제
              </button>
            ) : null}
          </div>
        </section>

        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={categoryTone[post.category]}>{categoryLabels[post.category]}</Badge>
            {isHidden ? <Badge tone="amber">숨김</Badge> : null}
            <span className="text-sm font-semibold text-slate-500">조회 {post.views}</span>
            <span className="text-sm font-semibold text-slate-500">댓글 {comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0)}</span>
            <span className="text-sm font-semibold text-slate-500">첨부 {attachments.length}</span>
          </div>
          <h3 className="mt-4 text-2xl font-black text-slate-950">{post.title}</h3>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-100 pb-5 text-sm font-semibold text-slate-500">
            <span>작성자 {post.author}</span>
            <span>작성일 {post.createdAt}</span>
            <span>수정일 {post.updatedAt}</span>
          </div>
          <p className="mt-6 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">{post.content}</p>
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
                <button type="button" onClick={() => handleDownload(file.fileName)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                  <Download className="h-3.5 w-3.5" />다운로드
                </button>
              </div>
            ))}
            {attachments.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">첨부파일이 없습니다.</p> : null}
          </div>
        </Card>

        <Card className="mt-5 p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-black text-slate-950">댓글</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {commentManageable ? "댓글과 대댓글을 작성하고 관리할 수 있습니다." : commentWritable ? "댓글과 대댓글 작성이 가능합니다." : "댓글은 조회만 가능합니다."}
              </p>
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
              <CommentItem
                key={comment.id}
                comment={comment}
                canReply={commentWritable}
                replyValue={replyDrafts[comment.id] ?? ""}
                onReplyChange={handleReplyChange}
                onReplySubmit={handleAddReply}
                onDelete={handleDeleteComment}
              />
            ))}
            {comments.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">등록된 댓글이 없습니다.</p> : null}
          </div>
        </Card>
      </AppLayout>
    </RequireAuth>
  );
}
