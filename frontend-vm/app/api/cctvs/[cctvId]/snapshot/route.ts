/**
 * 파일 역할: CCTV 요청을 백엔드 또는 외부 미디어 서버로 중계하는 Next.js Route Handler입니다.
 * 유지보수 참고: 브라우저에 노출할 응답 상태와 헤더를 정리하며, 서버 주소나 내부 오류 정보가 그대로 전달되지 않도록 주의합니다.
 */
import { NextRequest } from "next/server";
import { authFailureResponse, requireServerAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const FLASK_API_BASE_URL =
  process.env.FLASK_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://192.168.0.187:5000";

const CCTV_ACCESS_ROLES = ["SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN"] as const;

function normalizeAiCameraId(cctvId: string) {
  const decoded = decodeURIComponent(cctvId);
  const match = decoded.match(/^CCTV-0*([1-9]\d*)$/i);

  if (match) {
    return `camera-${Number(match[1])}`;
  }

  return decoded;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cctvId: string }> }
) {
  const auth = await requireServerAuth(request, CCTV_ACCESS_ROLES);
  if (!auth.ok) return authFailureResponse(auth);

  const { cctvId } = await context.params;
  const cameraId = normalizeAiCameraId(cctvId);
  const upstreamUrl = new URL(
    `/api/ai-media/cctvs/${encodeURIComponent(cameraId)}/snapshot/latest.jpg`,
    FLASK_API_BASE_URL.replace(/\/$/, "")
  );

  try {
    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${auth.token}` },
    });

    if (!response.body) {
      return new Response("Snapshot not available", { status: response.status || 502 });
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Snapshot not available", { status: 502 });
  }
}
