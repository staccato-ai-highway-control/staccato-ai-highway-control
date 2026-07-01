import {
  apiClient,
  getEnvelopeData,
  type FlexibleApiResponse,
} from "@/lib/apiClient";
import type {
  GetResourcesParams,
  ResourceItem,
  ResourceListResponse,
} from "@/features/resources/types";

const SECURITY_LOGS_BASE_PATH = "/api/security-logs";

type SecurityLogListParams = Omit<GetResourcesParams, "category">;

function buildQuery(params: SecurityLogListParams = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getSecurityLogs(
  params: SecurityLogListParams = {}
) {
  const response = await apiClient<
    FlexibleApiResponse<ResourceListResponse>
  >(`${SECURITY_LOGS_BASE_PATH}${buildQuery(params)}`);

  const data = getEnvelopeData(response);

  return {
    ...data,
    items: data.items ?? [],
  };
}

export async function getSecurityLog(id: string | number) {
  return getEnvelopeData(
    await apiClient<FlexibleApiResponse<ResourceItem>>(
      `${SECURITY_LOGS_BASE_PATH}/${id}`
    )
  );
}

export async function getSecurityLogDownloadBlob(
  id: string | number
) {
  const blob = await apiClient<Blob>(
    `${SECURITY_LOGS_BASE_PATH}/${id}/download`,
    {
      method: "GET",
      responseType: "blob",
    }
  );

  if (typeof Blob === "undefined" || !(blob instanceof Blob)) {
    throw new Error("다운로드 응답이 Blob 형식이 아닙니다.");
  }

  return blob;
}

export async function downloadSecurityLogFile(
  id: string | number,
  fileName: string
) {
  const blob = await getSecurityLogDownloadBlob(id);
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  window.URL.revokeObjectURL(url);
}
