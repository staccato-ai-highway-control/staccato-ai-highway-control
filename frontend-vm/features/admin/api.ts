import { apiClient } from "@/lib/apiClient";
import type { AdminUser, SignupRequestApiItem, SignupRequestStatus } from "./types";

type FlexibleListResponse<T> = {
  data?: T[];
  users?: T[];
  signup_requests?: T[];
  message?: string;
};

function normalizeList<T>(response: T[] | FlexibleListResponse<T>) {
  if (Array.isArray(response)) return response;
  return response.data ?? response.users ?? response.signup_requests ?? [];
}

export async function getAdminUsers() {
  const response = await apiClient<AdminUser[] | FlexibleListResponse<AdminUser>>("/auth/users");
  return normalizeList(response);
}

export async function getSignupRequests(status: SignupRequestStatus | "ALL" = "REQUESTED") {
  const query = status === "ALL" ? "" : `?status=${encodeURIComponent(status)}`;
  const response = await apiClient<SignupRequestApiItem[] | FlexibleListResponse<SignupRequestApiItem>>(`/auth/signup-requests${query}`);
  return normalizeList(response);
}

export function approveSignupRequest(signupRequestId: number) {
  return apiClient(`/auth/signup-requests/${signupRequestId}/approve`, { method: "POST" });
}

export function rejectSignupRequest(signupRequestId: number, rejectReason = "관리자 거절") {
  return apiClient(`/auth/signup-requests/${signupRequestId}/reject`, {
    method: "POST",
    body: { reject_reason: rejectReason },
  });
}
