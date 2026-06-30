import type { NextRequest } from "next/server";

export type ServerAuthUser = {
  id?: string | number;
  role?: string;
  account_status?: string;
  is_email_verified?: boolean;
};

export type ServerAuthResult =
  | { ok: true; token: string; user: ServerAuthUser }
  | { ok: false; status: 401 | 403 | 503; message: string };

const AUTH_COOKIE_NAME = "staccato_access_token";
const FLASK_API_BASE_URL = process.env.FLASK_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://192.168.0.187:5000";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();
  return request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
}

function getUserFromPayload(payload: unknown): ServerAuthUser | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { user?: ServerAuthUser; data?: { user?: ServerAuthUser } };
  return record.user ?? record.data?.user ?? null;
}

function isActiveUser(user: ServerAuthUser) {
  return String(user.account_status ?? "ACTIVE").toUpperCase() === "ACTIVE" && user.is_email_verified !== false;
}

export async function requireServerAuth(request: NextRequest, allowedRoles?: readonly string[]): Promise<ServerAuthResult> {
  const token = getBearerToken(request);
  if (!token) return { ok: false, status: 401, message: "Authentication required" };

  try {
    const response = await fetch(`${FLASK_API_BASE_URL.replace(/\/$/, "")}/auth/me`, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (response.status === 401) return { ok: false, status: 401, message: "Invalid or expired token" };
    if (response.status === 403) return { ok: false, status: 403, message: "Forbidden" };
    if (!response.ok) return { ok: false, status: 503, message: "Authentication service unavailable" };

    const user = getUserFromPayload(await response.json().catch(() => null));
    if (!user) return { ok: false, status: 401, message: "Invalid authentication response" };
    if (!isActiveUser(user)) return { ok: false, status: 403, message: "Inactive account" };
    if (allowedRoles?.length && (!user.role || !allowedRoles.includes(user.role))) {
      return { ok: false, status: 403, message: "Insufficient role" };
    }

    return { ok: true, token, user };
  } catch {
    return { ok: false, status: 503, message: "Authentication service unavailable" };
  }
}

export function authFailureResponse(result: Extract<ServerAuthResult, { ok: false }>) {
  return Response.json({ success: false, message: result.message }, { status: result.status });
}
