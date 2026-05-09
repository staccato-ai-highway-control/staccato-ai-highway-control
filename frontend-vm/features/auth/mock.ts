import type { LoginRequest, LoginResponse } from "./types";

export async function mockLogin(payload: LoginRequest): Promise<LoginResponse> {
  if (!payload.email || !payload.password) {
    throw new Error("이메일과 비밀번호를 입력해주세요.");
  }

  return {
    accessToken: "mock-access-token",
    user: {
      id: "user-001",
      name: "김관리",
      email: payload.email,
      role: "SUPER_ADMIN",
    },
  };
}
