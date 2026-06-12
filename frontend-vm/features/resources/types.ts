/**
 * 파일 역할: 자료실 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type ResourceCategory = "RESUME" | "COVER_LETTER" | "PRESENTATION" | "MEETING_NOTE" | "ACCESS_LOG";

// 코드 설명: ResourceVisibility 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ResourceVisibility = "ADMIN_ALL" | "SUPER_ADMIN_ONLY" | "OWNER_ONLY";

// 코드 설명: ResourceItem 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ResourceItem = {
  id: number;
  category: ResourceCategory;
  category_label: string;
  title: string;
  description: string;
  author_id: number;
  author_name: string;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  visibility: ResourceVisibility;
  download_url?: string;
  created_at: string;
  updated_at: string;
};

// 코드 설명: GetResourcesParams 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type GetResourcesParams = {
  category?: ResourceCategory;
  keyword?: string;
  page?: number;
  size?: number;
};

// 코드 설명: ResourceListResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ResourceListResponse = {
  items: ResourceItem[];
  page: number;
  size: number;
  total: number;
  pages: number;
  total_count?: number;
  total_pages?: number;
};

// 코드 설명: CreateResourcePayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type CreateResourcePayload = {
  category: ResourceCategory;
  title: string;
  author_name?: string;
  description?: string;
  visibility: ResourceVisibility;
  file?: File | null;
};

// 코드 설명: UpdateResourcePayload 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type UpdateResourcePayload = Partial<Omit<CreateResourcePayload, "file">> & {
  file?: File | null;
};

// 코드 설명: DeleteResourceResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type DeleteResourceResponse = {
  message: string;
  id: number;
};
