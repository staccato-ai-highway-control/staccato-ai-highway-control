/**
 * 파일 역할: 게시판 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 *
 * 연결 구조: 화면 -> 도메인 함수 -> boardRequest -> /backend-api rewrite
 * -> Flask 게시판 API -> JSON 응답 -> 화면 상태 순서로 왕복합니다.
 * 게시판은 공개 조회와 파일 업로드를 함께 지원하기 위해 전용 boardRequest를 사용합니다.
 */
import { API_BASE_URL } from "@/lib/constants";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAccessToken } from "@/lib/authStorage";
// 코드 설명: @/lib/apiClient 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
// 코드 설명: ./types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type {
  BoardPost,
  CreateBoardPostPayload,
  CreateBoardPostResponse,
  GetBoardPostsParams,
  UpdateBoardPostPayload,
} from "./types";

// 코드 설명: BoardPostListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type BoardPostListResponse = FlexibleApiResponse<BoardPost[]>;
// 코드 설명: BoardPostResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type BoardPostResponse = FlexibleApiResponse<BoardPost>;
// 코드 설명: DeleteBoardPostResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type DeleteBoardPostResponse = {
  success: boolean;
  message: string;
};

// 코드 설명: ErrorPayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ErrorPayload = {
  message?: string;
  error?: string;
  detail?: string;
};

// 비어 있는 검색 조건은 URL에서 제외해 백엔드 기본값이 적용되게 합니다.
function buildQuery(params: GetBoardPostsParams = {}) {
  // 코드 설명: query 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
  const query = new URLSearchParams();

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: Object.entries(params).forEach(([key, value]) => { if (value !== undefi…
  Object.entries(params).forEach(([key, value]) => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: value !== undefined && value !== null && value !== ""
    if (value !== undefined && value !== null && value !== "") {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: query.set(key, String(value));
      query.set(key, String(value));
    }
  });

  // 코드 설명: queryString 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const queryString = query.toString();
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: queryString ? `?${queryString}` : ""
  return queryString ? `?${queryString}` : "";
}

// 브라우저의 /backend-api 요청은 next.config.js rewrite를 거쳐 실제 Flask로 전달됩니다.
function joinUrl(path: string) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: /^https?:\/\//.test(path)
  if (/^https?:\/\//.test(path)) return path;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// JSON이 아닌 오류 페이지와 빈 응답도 처리하기 위해 text로 읽은 뒤 파싱합니다.
async function parseBody(response: Response) {
  // 코드 설명: text 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const text = await response.text().catch(() => "");
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !text
  if (!text) return null;

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: JSON.parse(text) as unknown
    return JSON.parse(text) as unknown;
  } catch {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: text
    return text;
  }
}

// 코드 설명: isUnsafeErrorText 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isUnsafeErrorText(value: string) {
  // 코드 설명: normalized 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const normalized = value.trim().toLowerCase();
  // 코드 설명: 여러 검사 조건을 논리 연산으로 결합해 최종 boolean 판정 결과를 반환합니다.
  return (
    normalized.startsWith("<!doctype html") ||
    normalized.startsWith("<html") ||
    normalized.includes("werkzeug debugger") ||
    normalized.includes("traceback") ||
    normalized.includes("sqlalchemy") ||
    normalized.includes("internal server error") ||
    normalized.includes("axioserror") ||
    normalized.includes("typeerror:") ||
    /https?:\/\//i.test(value) ||
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(value) ||
    /\/(?:home|var|usr|tmp)\//.test(value)
  );
}

// 코드 설명: getErrorMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getErrorMessage(response: Response, payload: unknown) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof payload === "object" && payload !== null
  if (typeof payload === "object" && payload !== null) {
    // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const message = (payload as ErrorPayload).message ?? (payload as ErrorPayload).error ?? (payload as ErrorPayload).detail;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: message
    if (message) return isUnsafeErrorText(message) ? `게시판 API 요청 실패: ${response.status}` : message;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof payload === "string" && payload.trim()
  if (typeof payload === "string" && payload.trim()) return isUnsafeErrorText(payload) ? `게시판 API 요청 실패: ${response.status}` : payload;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `게시판 API 요청 실패: ${response.status}`
  return `게시판 API 요청 실패: ${response.status}`;
}

// 코드 설명: boardRequest 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
async function boardRequest<T>(path: string, options: { method?: string; body?: unknown; formData?: FormData; auth?: boolean } = {}) {
  // 코드 설명: headers 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const headers = new Headers();
  // 공개 조회는 auth:false로 토큰을 생략하고 변경 요청에는 Bearer 토큰을 첨부합니다.
  const token = options.auth === false ? null : getStoredAccessToken();

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: token
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // FormData의 multipart boundary는 브라우저가 생성하므로 Content-Type을 직접 지정하지 않습니다.
  if (options.body !== undefined && !options.formData) headers.set("Content-Type", "application/json");

  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  let response: Response;
  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: response = await fetch(joinUrl(path), { method: options.method ?? "GET"…
    response = await fetch(joinUrl(path), {
      method: options.method ?? "GET",
      headers,
      body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error("Flask 서버에 연결할 수 없습니다.")
    throw new Error("Flask 서버에 연결할 수 없습니다.");
  }

  // 코드 설명: payload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const payload = await parseBody(response);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !response.ok
  if (!response.ok) throw new Error(getErrorMessage(response, payload));
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: payload as T
  return payload as T;
}

// 코드 설명: getBoardPosts 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getBoardPosts(params: GetBoardPostsParams = {}) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await boardRequest<BoardPostListResponse>(`/board/posts${buildQuery(params)}`, {
    auth: false,
  });
  // 코드 설명: posts 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const posts = getEnvelopeData<BoardPost[]>(response);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: posts.filter((post) => post.post_status !== "DELETED")
  return posts.filter((post) => post.post_status !== "DELETED");
}

// GET /board/posts/:id: 상세/수정 화면의 초기 게시글을 조회합니다.
export async function getBoardPost(postId: string | number) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await boardRequest<BoardPostResponse>(`/board/posts/${postId}`, {
    auth: false,
  });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<BoardPost>(response)
  return getEnvelopeData<BoardPost>(response);
}

// 첨부 파일과 텍스트를 함께 보내기 위해 multipart/form-data를 구성합니다.
export async function createBoardPost(payload: CreateBoardPostPayload) {
  // 코드 설명: formData FormData를 만들어 텍스트와 파일을 multipart 요청으로 함께 보냅니다.
  const formData = new FormData();
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: formData.append("board_type", payload.board_type);
  formData.append("board_type", payload.board_type);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: formData.append("title", payload.title);
  formData.append("title", payload.title);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: formData.append("content", payload.content);
  formData.append("content", payload.content);
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: formData.append("is_pinned", String(payload.is_pinned ?? 0));
  formData.append("is_pinned", String(payload.is_pinned ?? 0));
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: payload.file
  if (payload.file) formData.append("file", payload.file);

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: boardRequest<CreateBoardPostResponse>("/board/posts", { method: "POST",…
  return boardRequest<CreateBoardPostResponse>("/board/posts", {
    method: "POST",
    formData,
  });
}

// PUT /board/posts/:id: 화면에서 변경한 필드를 JSON 본문으로 전송합니다.
export async function updateBoardPost(postId: string | number, payload: UpdateBoardPostPayload) {
  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await boardRequest<BoardPostResponse>(`/board/posts/${postId}`, {
    method: "PUT",
    body: payload,
  });
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: getEnvelopeData<BoardPost>(response)
  return getEnvelopeData<BoardPost>(response);
}

// 코드 설명: deleteBoardPost 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function deleteBoardPost(postId: string | number) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: boardRequest<DeleteBoardPostResponse>(`/board/posts/${postId}`, { metho…
  return boardRequest<DeleteBoardPostResponse>(`/board/posts/${postId}`, {
    method: "DELETE",
  });
}
