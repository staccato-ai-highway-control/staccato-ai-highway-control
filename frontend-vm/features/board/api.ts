import { API_BASE_URL } from "@/lib/constants";
import { getStoredAccessToken } from "@/lib/authStorage";
import { getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import type {
  BoardPost,
  CreateBoardPostPayload,
  CreateBoardPostResponse,
  GetBoardPostsParams,
  UpdateBoardPostPayload,
} from "./types";

type BoardPostListResponse = FlexibleApiResponse<BoardPost[]>;
type BoardPostResponse = FlexibleApiResponse<BoardPost>;
type DeleteBoardPostResponse = {
  success: boolean;
  message: string;
};

type ErrorPayload = {
  message?: string;
  error?: string;
  detail?: string;
};

function buildQuery(params: GetBoardPostsParams = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function joinUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function parseBody(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(response: Response, payload: unknown) {
  if (typeof payload === "object" && payload !== null) {
    const message = (payload as ErrorPayload).message ?? (payload as ErrorPayload).error ?? (payload as ErrorPayload).detail;
    if (message) return message;
  }

  if (typeof payload === "string" && payload.trim()) return payload;
  return `게시판 API 요청 실패: ${response.status}`;
}

async function boardRequest<T>(path: string, options: { method?: string; body?: unknown; formData?: FormData; auth?: boolean } = {}) {
  const headers = new Headers();
  const token = options.auth === false ? null : getStoredAccessToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body !== undefined && !options.formData) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(joinUrl(path), {
      method: options.method ?? "GET",
      headers,
      body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new Error("Flask 서버에 연결할 수 없습니다.");
  }

  const payload = await parseBody(response);
  if (!response.ok) throw new Error(getErrorMessage(response, payload));
  return payload as T;
}

export async function getBoardPosts(params: GetBoardPostsParams = {}) {
  const response = await boardRequest<BoardPostListResponse>(`/board/posts${buildQuery(params)}`, {
    auth: false,
  });
  const posts = getEnvelopeData<BoardPost[]>(response);
  return posts.filter((post) => post.post_status !== "DELETED");
}

export async function getBoardPost(postId: string | number) {
  const response = await boardRequest<BoardPostResponse>(`/board/posts/${postId}`, {
    auth: false,
  });
  return getEnvelopeData<BoardPost>(response);
}

export async function createBoardPost(payload: CreateBoardPostPayload) {
  const formData = new FormData();
  formData.append("board_type", payload.board_type);
  formData.append("title", payload.title);
  formData.append("content", payload.content);
  formData.append("is_pinned", String(payload.is_pinned ?? 0));
  if (payload.file) formData.append("file", payload.file);

  return boardRequest<CreateBoardPostResponse>("/board/posts", {
    method: "POST",
    formData,
  });
}

export async function updateBoardPost(postId: string | number, payload: UpdateBoardPostPayload) {
  const response = await boardRequest<BoardPostResponse>(`/board/posts/${postId}`, {
    method: "PUT",
    body: payload,
  });
  return getEnvelopeData<BoardPost>(response);
}

export function deleteBoardPost(postId: string | number) {
  return boardRequest<DeleteBoardPostResponse>(`/board/posts/${postId}`, {
    method: "DELETE",
  });
}
