import type { LoginRequest, LoginResponse } from "./types";

export async function mockLogin(payload: LoginRequest): Promise<LoginResponse> {
  if (!payload.login_id || !payload.password) {
    throw new Error("아이디와 비밀번호를 입력해주세요.");
  }

  return {
    accessToken: "mock-access-token",
    user: {
      id: "user-001",
      name: "김관리",
      login_id: payload.login_id,
      email: "admin@staccato.com",
      role: "SUPER_ADMIN",
    },
  };
}
