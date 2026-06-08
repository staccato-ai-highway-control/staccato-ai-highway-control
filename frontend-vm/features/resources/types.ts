export type ResourceCategory = "RESUME" | "COVER_LETTER" | "PRESENTATION" | "MEETING_NOTE";

export type ResourceVisibility = "ADMIN_ALL" | "SUPER_ADMIN_ONLY" | "OWNER_ONLY";

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

export type GetResourcesParams = {
  category?: ResourceCategory;
  keyword?: string;
  page?: number;
  size?: number;
};

export type ResourceListResponse = {
  items: ResourceItem[];
  page: number;
  size: number;
  total: number;
  pages: number;
  total_count?: number;
  total_pages?: number;
};

export type CreateResourcePayload = {
  category: ResourceCategory;
  title: string;
  author_name?: string;
  description?: string;
  visibility: ResourceVisibility;
  file?: File | null;
};

export type UpdateResourcePayload = Partial<Omit<CreateResourcePayload, "file">> & {
  file?: File | null;
};

export type DeleteResourceResponse = {
  message: string;
  id: number;
};
