"use client";

import { apiClient } from "@/lib/apiClient";
import { mockLogin } from "./mock";
import type { LoginRequest, LoginResponse, SignupRequest } from "./types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  if (USE_MOCK) return mockLogin(payload);
  return apiClient<LoginResponse>("/api/auth/login", { method: "POST", body: payload });
}

export async function requestSignup(payload: SignupRequest) {
  return apiClient<{ ok: boolean }>("/api/auth/signup-requests", { method: "POST", body: payload });
}

