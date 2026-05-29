import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ||
  process.env.NEXT_PUBLIC_AI_VM_BASE_URL ||
  "http://127.0.0.1:5005";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cctvId: string }> }
) {
  const { cctvId } = await context.params;
  const sourceUrl = request.nextUrl.searchParams.get("source_url");

  const upstream = new URL(
    `/streams/${encodeURIComponent(cctvId)}.mjpeg`,
    AI_VM_BASE_URL
  );

  if (sourceUrl) {
    upstream.searchParams.set("source_url", sourceUrl);
  }

  const response = await fetch(upstream.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "multipart/x-mixed-replace,image/jpeg,*/*",
    },
  });

  if (!response.ok || !response.body) {
    return new Response(`AI stream proxy failed: ${response.status} ${upstream.toString()}`, {
      status: 502,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
