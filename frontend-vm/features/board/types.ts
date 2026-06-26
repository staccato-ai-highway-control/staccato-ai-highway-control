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

export type GetBoardPostsParams = {
  keyword?: string;
  board_type?: string;
  author_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
};

export type CreateBoardPostPayload = {
  board_type: string;
  title: string;
  content: string;
  is_pinned?: number;
  file?: File | null;
};

export type UpdateBoardPostPayload = {
  title?: string;
  content?: string;
  board_type?: string;
  is_pinned?: number;
};

export type CreateBoardPostResponse = {
  success: boolean;
  message: string;
  data: {
    post_id: number;
    author_name: string;
    is_pinned: number;
  };
};
