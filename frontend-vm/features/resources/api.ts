import { getStoredAccessToken } from "@/lib/authStorage";
import { API_BASE_URL } from "@/lib/constants";
import { apiClient } from "@/lib/apiClient";
import type {
  CreateResourcePayload,
  DeleteResourceResponse,
  GetResourcesParams,
  ResourceItem,
  ResourceListResponse,
  UpdateResourcePayload,
} from "./types";

const RESOURCE_BASE_PATH = "/api/resources";

function buildQuery(params: GetResourcesParams = {}) {
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

function buildResourceFormData(payload: CreateResourcePayload | UpdateResourcePayload) {
  const formData = new FormData();

  if (payload.category) formData.append("category", payload.category);
  if (payload.title) formData.append("title", payload.title);
  if (payload.description !== undefined) formData.append("description", payload.description);
  if (payload.visibility) formData.append("visibility", payload.visibility);
  if (payload.author_name) formData.append("author_name", payload.author_name);
  if (payload.file) formData.append("file", payload.file);

  return formData;
}

export function getResources(params: GetResourcesParams = {}) {
  return apiClient<ResourceListResponse>(`${RESOURCE_BASE_PATH}${buildQuery(params)}`);
}

export function getResource(id: string | number) {
  return apiClient<ResourceItem>(`${RESOURCE_BASE_PATH}/${id}`);
}

export function createResource(payload: CreateResourcePayload) {
  return apiClient<ResourceItem>(RESOURCE_BASE_PATH, {
    method: "POST",
    formData: buildResourceFormData(payload),
  });
}

export function updateResource(id: string | number, payload: UpdateResourcePayload) {
  return apiClient<ResourceItem>(`${RESOURCE_BASE_PATH}/${id}`, {
    method: "PATCH",
    formData: buildResourceFormData(payload),
  });
}

export function deleteResource(id: string | number) {
  return apiClient<DeleteResourceResponse>(`${RESOURCE_BASE_PATH}/${id}`, {
    method: "DELETE",
  });
}

export async function downloadResourceFile(id: string | number, fileName: string) {
  const headers = new Headers();
  const token = getStoredAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(joinUrl(`${RESOURCE_BASE_PATH}/${id}/download`), { headers });
  if (!response.ok) throw new Error(response.status === 404 ? "파일을 찾을 수 없습니다." : "파일 다운로드에 실패했습니다.");

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
