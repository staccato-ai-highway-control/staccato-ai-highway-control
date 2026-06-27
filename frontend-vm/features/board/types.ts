/**
 * 파일 역할: 게시판 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type BoardPost = {
  id: number;
  board_type: string;
  title: string;
  content: string;
  author_id: number;
  post_status: string;
  is_pinned: number;
  view_count: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

// 코드 설명: GetBoardPostsParams 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type GetBoardPostsParams = {
  keyword?: string;
  board_type?: string;
  author_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
};

// 코드 설명: CreateBoardPostPayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type CreateBoardPostPayload = {
  board_type: string;
  title: string;
  content: string;
  is_pinned?: number;
  file?: File | null;
};

// 코드 설명: UpdateBoardPostPayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type UpdateBoardPostPayload = {
  title?: string;
  content?: string;
  board_type?: string;
  is_pinned?: number;
};

// 코드 설명: CreateBoardPostResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type CreateBoardPostResponse = {
  success: boolean;
  message: string;
  data: {
    post_id: number;
    author_name: string;
    is_pinned: number;
  };
};
