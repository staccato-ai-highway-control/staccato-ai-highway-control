import { getStoredAccessToken } from "@/lib/authStorage";
import { API_BASE_URL } from "@/lib/constants";
import { apiClient, getEnvelopeData, type FlexibleApiResponse } from "@/lib/apiClient";
import type { CreateResourcePayload, DeleteResourceResponse, GetResourcesParams, ResourceItem, ResourceListResponse, UpdateResourcePayload } from "./types";

const RESOURCE_BASE_PATH = "/api/resources";

function buildQuery(params: GetResourcesParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== "") query.set(key, String(value)); });
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

export async function getResources(params: GetResourcesParams = {}) {
  const response = await apiClient<FlexibleApiResponse<ResourceListResponse>>(
    `${RESOURCE_BASE_PATH}${buildQuery(params)}`
  );

  const data = getEnvelopeData(response);
  const items = data.items ?? [];

  const isAccessLogMode = String(params.category) === "ACCESS_LOG";

  const visibleItems = isAccessLogMode
    ? items.filter((item) => String(item.category) === "ACCESS_LOG")
    : items.filter((item) => String(item.category) !== "ACCESS_LOG");

  return {
    ...data,
    items: visibleItems,
    total: visibleItems.length,
    total_count: visibleItems.length,
    pages: 1,
    total_pages: 1,
  };
}

export async function getResource(id: string | number) {
  return getEnvelopeData(await apiClient<FlexibleApiResponse<ResourceItem>>(`${RESOURCE_BASE_PATH}/${id}`));
}

export async function createResource(payload: CreateResourcePayload) {
  return getEnvelopeData(await apiClient<FlexibleApiResponse<ResourceItem>>(RESOURCE_BASE_PATH, { method: "POST", formData: buildResourceFormData(payload) }));
}

export async function updateResource(id: string | number, payload: UpdateResourcePayload) {
  return getEnvelopeData(await apiClient<FlexibleApiResponse<ResourceItem>>(`${RESOURCE_BASE_PATH}/${id}`, { method: "PATCH", formData: buildResourceFormData(payload) }));
}

export function deleteResource(id: string | number) {
  return apiClient<DeleteResourceResponse>(`${RESOURCE_BASE_PATH}/${id}`, { method: "DELETE" });
}

export async function downloadResourceFile(id: string | number, fileName: string) {
  const headers = new Headers();
  const token = getStoredAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(joinUrl(`${RESOURCE_BASE_PATH}/${id}/download`), { headers });
  if (!response.ok) throw new Error(response.status === 404 ? "파일을 찾을 수 없습니다." : response.status === 403 ? "파일 다운로드 권한이 없습니다." : "파일 다운로드에 실패했습니다.");
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export function getSecurityLogResources(
  params: Omit<GetResourcesParams, "category"> = {}
) {
  return getResources({
    ...params,
    category: "ACCESS_LOG" as unknown as GetResourcesParams["category"],
  });
}