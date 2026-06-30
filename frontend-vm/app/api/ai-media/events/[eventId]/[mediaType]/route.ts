import { NextRequest } from "next/server";
import { authFailureResponse, requireServerAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const FLASK_API_BASE_URL =
  process.env.FLASK_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://192.168.0.187:5000";

const MEDIA_TYPE_ALLOWLIST = new Set(["snapshot", "video", "stream"]);
const MEDIA_ACCESS_ROLES = ["SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN"] as const;

const RESPONSE_HEADER_ALLOWLIST = [
  "content-range",
  "accept-ranges",
  "content-length",
  "content-disposition",
  "etag",
  "last-modified",
] as const;

function buildUpstreamHeaders(token: string, request: NextRequest) {
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);
  return headers;
}

function buildMediaResponseHeaders(response: Response) {
  const headers = new Headers({
    "Content-Type": response.headers.get("content-type") || "application/octet-stream",
    "Cache-Control": "no-store",
  });

  RESPONSE_HEADER_ALLOWLIST.forEach((name) => {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  });

  return headers;
}

function isSafePathSegment(value: string) {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string; mediaType: string }> }
) {
  const auth = await requireServerAuth(request, MEDIA_ACCESS_ROLES);
  if (!auth.ok) return authFailureResponse(auth);

  const { eventId, mediaType } = await context.params;
  if (!isSafePathSegment(eventId) || !MEDIA_TYPE_ALLOWLIST.has(mediaType)) {
    return Response.json({ success: false, message: "Invalid media request" }, { status: 400 });
  }

  const upstreamUrl = new URL(
    `/api/ai-media/events/${encodeURIComponent(eventId)}/${encodeURIComponent(mediaType)}`,
    FLASK_API_BASE_URL.replace(/\/$/, "")
  );

  const response = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: buildUpstreamHeaders(auth.token, request),
  });

  if (!response.ok || !response.body) {
    return new Response("Failed to fetch event media", { status: response.status || 502 });
  }

  return new Response(response.body, {
    status: response.status,
    headers: buildMediaResponseHeaders(response),
  });
}
